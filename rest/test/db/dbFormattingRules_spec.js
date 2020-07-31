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
const { Binary, Int32 } = require('mongodb');

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

	describe('can format uint type', () => {
		const testCases = [
			{ name: 'uint value 0', value: 0, formated: 0 },
			{ name: 'uint8 value 255', value: 255, formated: 255 },
			{ name: 'uint16 value 65535', value: 65535, formated: 65535 },
			{ name: 'uint32 value -1', value: -1, formated: 4294967295 }
		];

		/*
		// Mira't aixo
		const int32 = (new Int32(65536)).valueOf();
		// el valueOf crec que no fa falta perque es crida implicitament
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf
		const buffer = Buffer.alloc(4, 0);
		buffer.writeInt32LE(int32);
		console.log(buffer.readUInt16LE());
		*/

		testCases.forEach(testCase => {
			it(testCase.name, () => {
				// Arrange + Act:
				const result = formattingRules[ModelType.uint](testCase.value);

				// Assert:
				expect(result).to.equal(testCase.formated);
			});
		});
	});

	it('can format uint64 type from Long', () => {
		// Arrange:
		const object = convertToLong([1, 2]);

		// Act:
		const result = formattingRules[ModelType.uint64](object);

		// Assert:
		expect(result).to.equal('8589934593');
	});

	it('can format uint64HexIdentifier type from Long', () => {
		// Arrange:
		const object = convertToLong([1, 2]);

		// Act:
		const result = formattingRules[ModelType.uint64HexIdentifier](object);

		// Assert:
		expect(result).to.equal('0000000200000001');
	});

	describe('can format int type', () => {
		const testCases = [
			{ name: 'negative value', value: -1245, formated: -1245 },
			{ name: '0', value: 0, formated: 0 },
			{ name: 'positive value', value: 1245, formated: 1245 }
		];

		testCases.forEach(testCase => {
			it(testCase.name, () => {
				// Arrange + Act:
				const result = formattingRules[ModelType.int](testCase.value);

				// Assert:
				expect(result).to.equal(testCase.formated);
			});
		});
	});
});
