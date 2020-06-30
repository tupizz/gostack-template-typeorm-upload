// import AppError from '../errors/AppError';

import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    try {
      await transactionRepository.findOneOrFail(id);
      await transactionRepository.delete(id);
    } catch (error) {
      throw new AppError("Transaction doesn't exist by given id");
    }
  }
}

export default DeleteTransactionService;
