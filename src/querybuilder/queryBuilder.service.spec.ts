import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Querybuilder } from './queryBuilder';
import { QuerybuilderService } from './queryBuilder.service';

const makeMockRequest = (query: Record<string, any> = {}): Partial<Request> => ({
  query,
  res: { setHeader: jest.fn() } as unknown as any
});

const makeQuerybuilder = (query: Record<string, any> = {}) => {
  return new Querybuilder(makeMockRequest(query) as Request);
};

type MockDelegate = { count: jest.Mock; findMany: (args?: { where?: Record<string, any> }) => Promise<any[]> };
type MockPrisma = { Post: MockDelegate; User: MockDelegate };

const makeService = (query: Record<string, any> = {}, prismaCount = 10) => {
  const qb = makeQuerybuilder(query);
  const prisma: MockPrisma = {
    Post: { count: jest.fn().mockResolvedValue(prismaCount), findMany: jest.fn().mockResolvedValue([]) },
    User: { count: jest.fn().mockResolvedValue(prismaCount), findMany: jest.fn().mockResolvedValue([]) }
  };
  const service = new QuerybuilderService<MockPrisma>(qb, prisma);
  return { service, qb, prisma };
};

describe('QuerybuilderService', () => {
  describe('setHeaders', () => {
    it('should call prisma.count and set count header when setHeaders=true', async () => {
      const { service, qb, prisma } = makeService();

      await service.query({ model: 'Post', setHeaders: true });

      expect(prisma.Post.count).toHaveBeenCalledWith({ where: {} });
      expect(qb.request.res.setHeader).toHaveBeenCalledWith('count', 10);
    });

    it('should not call prisma.count or set count header when setHeaders=false', async () => {
      const { service, qb, prisma } = makeService();

      await service.query({ model: 'Post', setHeaders: false });

      expect(prisma.Post.count).not.toHaveBeenCalled();
      expect(qb.request.res.setHeader).not.toHaveBeenCalledWith('count', expect.anything());
    });
  });

  describe('where', () => {
    it('should replace where when mergeWhere=false', async () => {
      const { service } = makeService({ 'filter[0][path]': 'name', 'filter[0][value]': 'alice' });

      const result = await service.query({ model: 'Post', setHeaders: false, where: { published: true }, mergeWhere: false });

      expect(result.where).toStrictEqual({ published: true });
    });

    it('should merge where when mergeWhere=true', async () => {
      const { service } = makeService();

      const result = await service.query({ model: 'Post', setHeaders: false, where: { published: true }, mergeWhere: true });

      expect(result.where).toMatchObject({ published: true });
    });

    it('should not override where when where is not passed', async () => {
      const { service } = makeService();

      const result = await service.query({ model: 'Post', setHeaders: false });

      expect(result.where).toStrictEqual({});
    });
  });

  describe('paginationOnly', () => {
    it('should remove select and include when paginationOnly=true', async () => {
      const { service } = makeService({ select: 'name,email' });

      const result = await service.query({ model: 'Post', setHeaders: false, paginationOnly: true });

      expect(result.select).toBeUndefined();
      expect(result.include).toBeUndefined();
    });

    it('should keep select when paginationOnly=false', async () => {
      const { service } = makeService({ select: 'name,email' });

      const result = await service.query({ model: 'Post', setHeaders: false, paginationOnly: false });

      expect(result.select).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw BadRequestException with message when querybuilder rejects with response.message', async () => {
      const { service } = makeService({ 'filter[0][path]': 'name', 'filter[0][operator]': 'invalid_op' });

      await expect(service.query({ model: 'Post', setHeaders: false })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with generic message on unknown error', async () => {
      const qb = makeQuerybuilder();
      jest.spyOn(qb, 'query').mockRejectedValue(new Error('unexpected'));
      const prisma = { Post: { count: jest.fn() } };
      const service = new QuerybuilderService(qb, prisma);

      await expect(service.query({ model: 'Post', setHeaders: false })).rejects.toThrow(
        'Internal error processing your query string, check your parameters'
      );
    });

    it('should throw BadRequestException when model does not exist in prisma', async () => {
      const { service } = makeService();

      await expect(service.query({ model: 'NonExistent' as any, setHeaders: false })).rejects.toThrow(
        'Model "NonExistent" not found in PrismaClient'
      );
    });
  });

  describe('forbiddenFields', () => {
    it('should strip forbidden fields from select via querybuilder', async () => {
      const { service } = makeService({ select: 'name,password' });

      const result = await service.query({ model: 'Post', setHeaders: false, forbiddenFields: ['password'] });

      expect(result.select?.['name']).toBe(true);
      expect(result.select?.['password']).toBeUndefined();
    });
  });

  describe('primaryKey', () => {
    it('should use custom primaryKey', async () => {
      const { service } = makeService({ select: 'name' });

      const result = await service.query({ model: 'Post', setHeaders: false, primaryKey: '_id' });

      expect(result.select?.['_id']).toBe(true);
    });
  });

  describe('onQuery', () => {
    it('should apply onQuery transform to the result', async () => {
      const qb = makeQuerybuilder();
      const prisma: MockPrisma = {
        Post: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
        User: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) }
      };
      const onQuery = jest.fn((q) => ({ ...q, where: { ...q.where, tenantId: 1 } }));
      const service = new QuerybuilderService<MockPrisma>(qb, prisma, onQuery);

      const result = await service.query({ model: 'Post', setHeaders: false });

      expect(onQuery).toHaveBeenCalled();
      expect(result.where).toMatchObject({ tenantId: 1 });
    });

    it('should not call onQuery when not provided', async () => {
      const { service } = makeService();

      const result = await service.query({ model: 'Post', setHeaders: false });

      expect(result.where).toStrictEqual({});
    });
  });

  describe('maxTake', () => {
    const makePrisma = (): MockPrisma => ({
      Post: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      User: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) }
    });

    it('should cap take when it exceeds maxTake', async () => {
      const service = new QuerybuilderService<MockPrisma>(makeQuerybuilder({ limit: '500' }), makePrisma(), undefined, 100);

      const result = await service.query({ model: 'Post', setHeaders: false });

      expect(result.take).toBe(100);
    });

    it('should not change take when below maxTake', async () => {
      const service = new QuerybuilderService<MockPrisma>(makeQuerybuilder({ limit: '10' }), makePrisma(), undefined, 100);

      const result = await service.query({ model: 'Post', setHeaders: false });

      expect(result.take).toBe(10);
    });
  });
});
