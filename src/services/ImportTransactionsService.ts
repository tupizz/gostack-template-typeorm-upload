// import Transaction from '../models/Transaction';
import path from 'path';
import fs from 'fs';
import parse from 'csv-parse';

import { getRepository, In, getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';

interface TransactionCsv {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const fileReference = path.join(uploadConfig.directory, filename);
    const fileExists = await fs.promises.stat(fileReference);

    if (!fileExists) {
      throw new AppError('Error uploading file...');
    }

    const transactionsReadStream = fs.createReadStream(fileReference);

    const parser = parse({
      delimiter: ',',
      trim: true,
      from_line: 2,
    });

    const parseCsv = transactionsReadStream.pipe(parser);

    const transactions: TransactionCsv[] = [];
    const categories: string[] = [];

    parseCsv.on('data', async (line: string[]) => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({
        title,
        type: type === 'income' ? 'income' : 'outcome',
        value: parseInt(value, 10),
        category,
      });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const existingCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existingCategoriesTitles = existingCategories.map(
      category => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existingCategoriesTitles.includes(category))
      // Retira as duplicatas
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existingCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(fileReference);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
