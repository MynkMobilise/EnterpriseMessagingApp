const {
  formatDate,
  formatDateReadable,
  sanitizeString,
  isValidEmail,
  isValidPhone,
  getPaginationMeta,
  generateSlug,
  generateRandomString,
  deepClone,
  removeSensitiveFields,
  isEmpty,
} = require('../../../src/utils/helpers');

describe('Helper Functions', () => {
  describe('formatDate', () => {
    test('should format date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe(date.toISOString());
    });

    test('should return null for null input', () => {
      expect(formatDate(null)).toBeNull();
    });
  });

  describe('formatDateReadable', () => {
    test('should format date to readable string', () => {
      const date = new Date('2024-01-01T12:30:45Z');
      const formatted = formatDateReadable(date);
      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
    });
  });

  describe('sanitizeString', () => {
    test('should sanitize string', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")script');
    });

    test('should return non-string values as-is', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBeNull();
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    test('should validate E.164 phone format', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('+441234567890')).toBe(true);
    });

    test('should reject invalid phone format', () => {
      expect(isValidPhone('1234567890')).toBe(false);
      expect(isValidPhone('+123')).toBe(false);
      expect(isValidPhone('+01234567890')).toBe(false);
    });
  });

  describe('getPaginationMeta', () => {
    test('should generate pagination metadata', () => {
      const meta = getPaginationMeta(1, 20, 100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(20);
      expect(meta.total).toBe(100);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(false);
    });

    test('should handle last page', () => {
      const meta = getPaginationMeta(5, 20, 100);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(true);
    });
  });

  describe('generateSlug', () => {
    test('should generate slug from string', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('Test@#$%String')).toBe('teststring');
      expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });

  describe('generateRandomString', () => {
    test('should generate random string of specified length', () => {
      const str = generateRandomString(10);
      expect(str.length).toBe(10);
    });

    test('should generate different strings', () => {
      const str1 = generateRandomString(32);
      const str2 = generateRandomString(32);
      expect(str1).not.toBe(str2);
    });
  });

  describe('deepClone', () => {
    test('should deep clone object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      cloned.b.c = 3;
      expect(original.b.c).toBe(2);
      expect(cloned.b.c).toBe(3);
    });
  });

  describe('removeSensitiveFields', () => {
    test('should remove sensitive fields', () => {
      const obj = {
        id: '123',
        email: 'test@example.com',
        password: 'secret',
        passwordHash: 'hash',
        token: 'token123',
      };
      const sanitized = removeSensitiveFields(obj);
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.id).toBe('123');
      expect(sanitized.email).toBe('test@example.com');
    });
  });

  describe('isEmpty', () => {
    test('should check if value is empty', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
      expect(isEmpty('test')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });
});


