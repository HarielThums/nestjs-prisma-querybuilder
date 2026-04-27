import { BadRequestException } from '@nestjs/common';
import { defaultPlainToClass } from './plainToClass.fn';
import defaultValidateOrReject from './validateOrReject.fn';
import { QueryValidator } from '../../querybuilder/dto/queryValidator.dto';

describe('defaultValidateOrReject', () => {
  it('should resolve without throwing for valid data', async () => {
    const dto = defaultPlainToClass(QueryValidator, { select: 'name', page: 1, limit: 10 });

    await expect(defaultValidateOrReject(dto)).resolves.toBeUndefined();
  });

  it('should resolve for empty query (all fields optional)', async () => {
    const dto = defaultPlainToClass(QueryValidator, {});

    await expect(defaultValidateOrReject(dto)).resolves.toBeUndefined();
  });

  it('should throw BadRequestException when validation fails', async () => {
    const dto = defaultPlainToClass(QueryValidator, { sort: { field: 'name', criteria: 'INVALID_CRITERIA' } });

    await expect(defaultValidateOrReject(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should include error messages array in the exception response', async () => {
    const dto = defaultPlainToClass(QueryValidator, { sort: { field: 'name', criteria: 'INVALID_CRITERIA' } });

    let caught: BadRequestException;
    try {
      await defaultValidateOrReject(dto);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = caught.getResponse() as { statusCode: number; message: string[] };
    expect(response.statusCode).toBe(400);
    expect(Array.isArray(response.message)).toBe(true);
    expect(response.message.length).toBeGreaterThan(0);
  });

  it('should collect top-level constraint errors (err.constraints truthy)', async () => {
    // Creates a top-level ValidationError with constraints directly (not nested in children).
    // QueryValidator.page has @IsNumber — NaN fails it at the root level.
    const dto = Object.assign(new QueryValidator(), { page: NaN });

    let caught: BadRequestException;
    try {
      await defaultValidateOrReject(dto);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = caught.getResponse() as { message: string[] };
    expect(Array.isArray(response.message)).toBe(true);
    expect(response.message.length).toBeGreaterThan(0);
  });

  it('should collect errors from deeply nested children (filter operator)', async () => {
    const dto = defaultPlainToClass(QueryValidator, {
      filter: [{ path: 'name', value: 'x', operator: 'INVALID_OPERATOR' }]
    });

    let caught: BadRequestException;
    try {
      await defaultValidateOrReject(dto);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = caught.getResponse() as { message: string[] };
    expect(Array.isArray(response.message)).toBe(true);
    expect(response.message.length).toBeGreaterThan(0);
  });

  it('should recurse into grandchildren errors (populate path empty forces 3-level tree)', async () => {
    // @ValidateNested({ each: true }) on an array creates: populate → index '0' → field
    // This intermediate index node forces getErrMessages to recurse (line 25 truthy branch).
    const dto = defaultPlainToClass(QueryValidator, {
      populate: [{ path: '', select: 'title' }]
    });

    let caught: BadRequestException;
    try {
      await defaultValidateOrReject(dto);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = caught.getResponse() as { message: string[] };
    expect(Array.isArray(response.message)).toBe(true);
    expect(response.message.length).toBeGreaterThan(0);
  });
});
