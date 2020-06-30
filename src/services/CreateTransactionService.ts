// import AppError from '../errors/AppError';

import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute(data: Request): Promise<Transaction> {
    const currentBalance = await getCustomRepository(
      TransactionsRepository,
    ).getBalance();

    if (data.type === 'outcome' && currentBalance.total < data.value) {
      throw new AppError(
        "You don't have enought money to handle this transaction",
      );
    }

    const category = await this.createOrFindCategory(data.category);

    const persistedTransaction = await this.createAndSaveTransaction(
      data,
      category,
    );

    return persistedTransaction;
  }

  private async createOrFindCategory(categoryName: string): Promise<Category> {
    const categoryRepository = getRepository(Category);

    const existingCategory = await categoryRepository.findOne({
      where: {
        title: categoryName,
      },
    });

    if (existingCategory) {
      return existingCategory;
    }

    const newCategory = categoryRepository.create({
      title: categoryName,
    });

    await categoryRepository.save(newCategory);

    return newCategory;
  }

  private async createAndSaveTransaction(
    data: Request,
    category: Category,
  ): Promise<Transaction> {
    const transactionRepository = getRepository(Transaction);

    const result = transactionRepository.create({
      title: data.title,
      category_id: category.id,
      category,
      value: data.value,
      type: data.type,
    });

    await transactionRepository.save(result);

    return result;
  }
}

export default CreateTransactionService;
