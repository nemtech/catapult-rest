/*
 * Copyright (c) 2016-present,
 * Jaguar0625, gimre, BloodyRookie, Tech Bureau, Corp. All rights reserved.
 *
 * This file is part of Catapult.
 *
 * Catapult is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Catapult is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Catapult.  If not, see <http://www.gnu.org/licenses/>.
 */

const formattingRules = require('../../src/db/dbFormattingRules');
const { convertToLong } = require('../../src/db/dbUtils');
const test = require('../testUtils');
const catapult = require('catapult-sdk');
const { expect } = require('chai');
const { Binary } = require('mongodb');

const { ModelType } = catapult.model;

describe('db formatting rules', () => {
	it('can format none type', () => {
		// Arrange:
		const object = { foo: 8 };

		// Act:
		const result = formattingRules[ModelType.none](object);

		// Assert:
		expect(result).to.deep.equal({ foo: 8 });
	});

	it('can format binary type', () => {
		// Arrange:
		const object = test.factory.createBinary(Buffer.from('FEDCBA9876543210', 'hex'));

		// Act:
		const result = formattingRules[ModelType.binary](object);

		// Assert:
		expect(result).to.equal('FEDCBA9876543210');
	});

	it('can format javascript buffer as binary type', () => {
		// Arrange:
		const object = Buffer.from('FEDCBA9876543210', 'hex');

		// Act:
		const result = formattingRules[ModelType.binary](object);

		// Assert:
		expect(result).to.equal('FEDCBA9876543210');
	});

	it('can format object id type', () => {
		// Arrange:
		const object = test.factory.createObjectIdFromHexString('3AEDCBA9876F94725732547F');

		// Act:
		const result = formattingRules[ModelType.objectId](object);

		// Assert:
		expect(result).to.equal('3AEDCBA9876F94725732547F');
	});

	it('can format status code type', () => {
		// Arrange: notice that codes are signed in db
		[0x80530001, -2142044159].forEach(code => {
			// Act:
			const result = formattingRules[ModelType.statusCode](code);

			// Assert:
			expect(result, `${code} code`).to.equal('Failure_Signature_Not_Verifiable');
		});
	});

	it('can format string type', () => {
		// Arrange:
		const object = test.factory.createBinary(Buffer.from('6361746170756C74', 'hex'));

		// Act:
		const result = formattingRules[ModelType.string](object);

		// Assert:
		expect(result).to.equal('catapult');
	});

	it('can format uint8 type', () => {
		// Act:
		const result = formattingRules[ModelType.uint8](255);

		// Assert:
		expect(result).to.equal(255);
	});

	it('can format uint8 type from Binary', () => {
		// Arrange:
		const buffer = Buffer.alloc(1, 0);
		buffer.writeUInt8(255);
		const object = new Binary(buffer);

		// Act:
		const result = formattingRules[ModelType.uint8](object);

		// Assert:
		expect(result).to.deep.equal(255);
	});

	it('can format uint16 type', () => {
		// Act:
		const result = formattingRules[ModelType.uint16](17434);

		// Assert:
		expect(result).to.equal(17434);
	});

	it('can format uint16 type from Binary', () => {
		// Arrange:
		const buffer = Buffer.alloc(2, 0);
		buffer.writeUInt16LE(17434);
		const object = new Binary(buffer);

		// Act:
		const result = formattingRules[ModelType.uint16](object);

		// Assert:
		expect(result).to.deep.equal(17434);
	});

	it('can format uint32 type', () => {
		// Act:
		const result = formattingRules[ModelType.uint32](1234567890);

		// Assert:
		expect(result).to.equal(1234567890);
	});

	it('can format uint32 type from Binary', () => {
		// Arrange:
		const buffer = Buffer.alloc(4, 0);
		buffer.writeUInt32LE(1234567890);
		const object = new Binary(buffer);

		// Act:
		const result = formattingRules[ModelType.uint32](object);

		// Assert:
		expect(result).to.deep.equal(1234567890);
	});

	it('can format uint64 type from Long', () => {
		// Arrange:
		const object = convertToLong([1, 2]);

		// Act:
		const result = formattingRules[ModelType.uint64](object);

		// Assert:
		expect(result).to.equal('8589934593');
	});

	it('can format uint64 type from Binary', () => {
		// Arrange:
		const buffer = Buffer.alloc(8, 0);
		buffer.writeUInt32LE(0x00ABCDEF, 0);
		buffer.writeUInt32LE(0x000FDFFF, 4);
		const object = new Binary(buffer);

		// Act:
		const result = formattingRules[ModelType.uint64](object);

		// Assert:
		expect(result).to.equal('4468410971573743');
	});

	it('can format uint64HexIdentifier type from Long', () => {
		// Arrange:
		const object = convertToLong([1, 2]);

		// Act:
		const result = formattingRules[ModelType.uint64HexIdentifier](object);

		// Assert:
		expect(result).to.equal('0000000200000001');
	});

	it('can format uint64HexIdentifier type from Binary', () => {
		// Arrange:
		const buffer = Buffer.alloc(8, 0);
		buffer.writeUInt32LE(0x00ABCDEF, 0);
		buffer.writeUInt32LE(0x000FDFFF, 4);
		const object = new Binary(buffer);

		// Act:
		const result = formattingRules[ModelType.uint64HexIdentifier](object);

		// Assert:
		expect(result).to.equal('000FDFFF00ABCDEF');
	});

	describe('can format int8 type', () => {
		const getOneByteBinaryBuffer = value => {
			const buffer = Buffer.alloc(1, 0);
			buffer.writeInt8(value);
			return new Binary(buffer);
		};

		const testCases = [
			{ name: 'int8 value 127', value: 127, formated: 127 },
			{ name: 'int8 value 0', value: 0, formated: 0 },
			{ name: 'int8 value -128', value: -128, formated: -128 },
			{ name: 'int8 binary 127', value: getOneByteBinaryBuffer(127), formated: 127 },
			{ name: 'int8 binary 0', value: getOneByteBinaryBuffer(0), formated: 0 },
			{ name: 'int8 binary -128', value: getOneByteBinaryBuffer(-128), formated: -128 }
		];

		testCases.forEach(testCase => {
			it(testCase.name, () => {
				// Arrange + Act:
				const result = formattingRules[ModelType.int8](testCase.value);

				// Assert:
				expect(result).to.equal(testCase.formated);
			});
		});
	});

	describe('can format int16 type', () => {
		const getTwoBytesBinaryBuffer = value => {
			const buffer = Buffer.alloc(2, 0);
			buffer.writeInt16LE(value);
			return new Binary(buffer);
		};

		const testCases = [
			{ name: 'int16 value 32767', value: 32767, formated: 32767 },
			{ name: 'int16 value 0', value: 0, formated: 0 },
			{ name: 'int16 value -32768', value: -32768, formated: -32768 },
			{ name: 'int16 binary 32767', value: getTwoBytesBinaryBuffer(32767), formated: 32767 },
			{ name: 'int16 binary 0', value: getTwoBytesBinaryBuffer(0), formated: 0 },
			{ name: 'int16 binary -32768', value: getTwoBytesBinaryBuffer(-32768), formated: -32768 }
		];

		testCases.forEach(testCase => {
			it(testCase.name, () => {
				// Arrange + Act:
				const result = formattingRules[ModelType.int16](testCase.value);

				// Assert:
				expect(result).to.equal(testCase.formated);
			});
		});
	});

	describe('can format boolean type', () => {
		const testCases = [
			{ name: 'true', value: true, formated: true },
			{ name: 'false', value: false, formated: false }
		];

		testCases.forEach(testCase => {
			it(testCase.name, () => {
				// Arrange + Act:
				const result = formattingRules[ModelType.boolean](testCase.value);

				// Assert:
				expect(result).to.equal(testCase.formated);
			});
		});
	});
});
