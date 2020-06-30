import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    return transactions.reduce(
      (previous, current) => {
        if (current.type === 'income') {
          const income = previous.income + current.value;
          return {
            income,
            outcome: previous.outcome,
            total: income - previous.outcome,
          };
        }

        const outcome = previous.outcome + current.value;
        return {
          income: previous.income,
          outcome,
          total: previous.income - outcome,
        };
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
  }
}

export default TransactionsRepository;
