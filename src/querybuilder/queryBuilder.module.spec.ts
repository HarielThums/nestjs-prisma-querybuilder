import { QuerybuilderModule } from './queryBuilder.module';
import { QuerybuilderService } from './queryBuilder.service';
import { Querybuilder } from './queryBuilder';
import { QUERYBUILDER_DEFAULT, getQuerybuilderToken } from './constants/queryBuilder.constants';

const makePrisma = () => ({ Post: { count: jest.fn() } });

describe('QuerybuilderModule', () => {
  describe('forRootAsync', () => {
    it('should return a DynamicModule with global=true by default', () => {
      const module = QuerybuilderModule.forRootAsync({
        useFactory: () => ({ prisma: makePrisma() })
      });

      expect(module.global).toBe(true);
      expect(module.module).toBe(QuerybuilderModule);
    });

    it('should allow overriding global to false', () => {
      const module = QuerybuilderModule.forRootAsync({
        global: false,
        useFactory: () => ({ prisma: makePrisma() })
      });

      expect(module.global).toBe(false);
    });

    it('should include Querybuilder in providers', () => {
      const module = QuerybuilderModule.forRootAsync({
        useFactory: () => ({ prisma: makePrisma() })
      });

      expect(module.providers).toContain(Querybuilder);
    });

    it('should include Querybuilder in exports', () => {
      const module = QuerybuilderModule.forRootAsync({
        useFactory: () => ({ prisma: makePrisma() })
      });

      expect(module.exports).toContain(Querybuilder);
    });

    describe('default instance (no name)', () => {
      it('should use QUERYBUILDER_DEFAULT token', () => {
        const module = QuerybuilderModule.forRootAsync({
          useFactory: () => ({ prisma: makePrisma() })
        });

        const providers = module.providers as any[];
        const tokenProvider = providers.find((p) => p?.provide === QUERYBUILDER_DEFAULT);
        expect(tokenProvider).toBeDefined();
      });

      it('should add QuerybuilderService alias provider', () => {
        const module = QuerybuilderModule.forRootAsync({
          useFactory: () => ({ prisma: makePrisma() })
        });

        const providers = module.providers as any[];
        const alias = providers.find((p) => p?.provide === QuerybuilderService);
        expect(alias).toBeDefined();
        expect(alias.useExisting).toBe(QUERYBUILDER_DEFAULT);
      });

      it('should export QuerybuilderService', () => {
        const module = QuerybuilderModule.forRootAsync({
          useFactory: () => ({ prisma: makePrisma() })
        });

        expect(module.exports).toContain(QuerybuilderService);
      });
    });

    describe('named instance', () => {
      it('should use namespaced token', () => {
        const module = QuerybuilderModule.forRootAsync({
          name: 'db2',
          useFactory: () => ({ prisma: makePrisma() })
        });

        const token = getQuerybuilderToken('db2');
        const providers = module.providers as any[];
        const tokenProvider = providers.find((p) => p?.provide === token);
        expect(tokenProvider).toBeDefined();
      });

      it('should not add QuerybuilderService alias for named instance', () => {
        const module = QuerybuilderModule.forRootAsync({
          name: 'db2',
          useFactory: () => ({ prisma: makePrisma() })
        });

        const providers = module.providers as any[];
        const alias = providers.find((p) => p?.provide === QuerybuilderService);
        expect(alias).toBeUndefined();
      });

      it('should not export QuerybuilderService for named instance', () => {
        const module = QuerybuilderModule.forRootAsync({
          name: 'db2',
          useFactory: () => ({ prisma: makePrisma() })
        });

        expect(module.exports).not.toContain(QuerybuilderService);
      });
    });

    it('should pass imports to DynamicModule', () => {
      const FakeModule = class {};
      const module = QuerybuilderModule.forRootAsync({
        imports: [FakeModule as any],
        useFactory: () => ({ prisma: makePrisma() })
      });

      expect(module.imports).toContain(FakeModule);
    });

    it('factory provider should instantiate QuerybuilderService with qb and prisma', async () => {
      const prisma = makePrisma();
      const module = QuerybuilderModule.forRootAsync({
        useFactory: () => ({ prisma })
      });

      const providers = module.providers as any[];
      const namedProvider = providers.find((p) => p?.provide === QUERYBUILDER_DEFAULT);
      const mockQb = {} as Querybuilder;

      const result = await namedProvider.useFactory(mockQb);

      expect(result).toBeInstanceOf(QuerybuilderService);
      expect(result.querybuilder).toBe(mockQb);
    });
  });
});
