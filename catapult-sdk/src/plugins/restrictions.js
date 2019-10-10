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

/** @module plugins/restrictions */
const EntityType = require('../model/EntityType');
const ModelType = require('../model/ModelType');
const sizes = require('../modelBinary/sizes');

const constants = { sizes };

const accountRestrictionTypeBlockOffset = 128;
const AccountRestrictionTypeFlags = Object.freeze({
	address: 1,
	mosaic: 2,
	operation: 4
});

const accountRestrictionsCreateBaseCodec = valueCodec => ({
	deserialize: parser => {
		const transaction = {};
		transaction.restrictionType = parser.uint8();
		transaction.modifications = [];
		const modificationsCount = parser.uint8();
		for (let i = 0; i < modificationsCount; ++i) {
			transaction.modifications.push({
				modificationAction: parser.uint8(),
				value: valueCodec.deserializeValue(parser)
			});
		}
		return transaction;
	},
	serialize: (transaction, serializer) => {
		serializer.writeUint8(transaction.restrictionType);
		serializer.writeUint8(transaction.modifications.length);
		for (let i = 0; i < transaction.modifications.length; ++i) {
			serializer.writeUint8(transaction.modifications[i].modificationAction);
			valueCodec.serializeValue(serializer, transaction.modifications[i].value);
		}
	}
});

const accountRestrictionTypeDescriptors = [
	{
		entityType: EntityType.accountRestrictionAddress,
		schemaPrefix: 'address',
		valueType: ModelType.binary,
		flag: AccountRestrictionTypeFlags.address
	},
	{
		entityType: EntityType.accountRestrictionMosaic,
		schemaPrefix: 'mosaic',
		valueType: ModelType.uint64HexIdentifier,
		flag: AccountRestrictionTypeFlags.mosaic
	},
	{
		entityType: EntityType.accountRestrictionOperation,
		schemaPrefix: 'operation',
		valueType: ModelType.uint16,
		flag: AccountRestrictionTypeFlags.operation
	}
];

/**
 * Creates a restrictions plugin.
 * @type {module:plugins/CatapultPlugin}
 */
const restrictionsPlugin = {
	AccountRestrictionType: Object.freeze({
		addressAllow: AccountRestrictionTypeFlags.address,
		addressBlock: AccountRestrictionTypeFlags.address + accountRestrictionTypeBlockOffset,
		mosaicAllow: AccountRestrictionTypeFlags.mosaic,
		mosaicBlock: AccountRestrictionTypeFlags.mosaic + accountRestrictionTypeBlockOffset,
		operationAllow: AccountRestrictionTypeFlags.operation,
		operationBlock: AccountRestrictionTypeFlags.operation + accountRestrictionTypeBlockOffset
	}),

	registerSchema: builder => {
		const modificationTypeSchema = modificationsSchemaName => ({
			modifications: { type: ModelType.array, schemaName: modificationsSchemaName }
		});

		// account restrictions
		accountRestrictionTypeDescriptors.forEach(restrictionTypeDescriptor => {
			// transaction schemas
			builder.addTransactionSupport(
				restrictionTypeDescriptor.entityType,
				modificationTypeSchema(`accountRestriction.${restrictionTypeDescriptor.schemaPrefix}ModificationType`)
			);
			builder.addSchema(`accountRestriction.${restrictionTypeDescriptor.schemaPrefix}ModificationType`, {
				value: restrictionTypeDescriptor.valueType
			});

			// aggregated account restriction schemas
			builder.addSchema(`accountRestriction.${restrictionTypeDescriptor.schemaPrefix}AccountRestriction`, {
				values: { type: ModelType.array, schemaName: restrictionTypeDescriptor.valueType }
			});
		});

		// account restriction fallback
		builder.addSchema('accountRestriction.fallback', {});

		// aggregated account restrictions schemas
		builder.addSchema('accountRestrictions', {
			accountRestrictions: { type: ModelType.object, schemaName: 'accountRestriction.restrictions' }
		});

		// account restriction restrictions
		builder.addSchema('accountRestriction.restrictions', {
			address: ModelType.binary,
			restrictions: {
				type: ModelType.array,
				schemaName: entity => {
					for (let i = 0; i < accountRestrictionTypeDescriptors.length; i++) {
						if ((entity.restrictionType & 0x3F) === accountRestrictionTypeDescriptors[i].flag)
							return `accountRestriction.${accountRestrictionTypeDescriptors[i].schemaPrefix}AccountRestriction`;
					}
					return 'accountRestriction.fallback';
				}
			}
		});

		// mosaic restrictions address
		builder.addTransactionSupport(EntityType.mosaicRestrictionAddress, {
			mosaicId: ModelType.uint64HexIdentifier,
			restrictionKey: ModelType.uint64HexIdentifier,
			targetAddress: ModelType.binary,
			previousRestrictionValue: ModelType.uint64,
			newRestrictionValue: ModelType.uint64
		});

		// mosaic restrictions global
		builder.addTransactionSupport(EntityType.mosaicRestrictionGlobal, {
			mosaicId: ModelType.uint64HexIdentifier,
			referenceMosaicId: ModelType.uint64HexIdentifier,
			restrictionKey: ModelType.uint64HexIdentifier,
			previousRestrictionValue: ModelType.uint64,
			newRestrictionValue: ModelType.uint64
		});

		builder.addSchema('mosaicRestriction.mosaicGlobalRestriction', {
			mosaicRestrictionEntry: { type: ModelType.object, schemaName: 'mosaicGlobalRestriction.entry' }
		});

		builder.addSchema('mosaicGlobalRestriction.entry', {
			compositeHash: ModelType.binary,
			mosaicId: ModelType.uint64HexIdentifier,
			restrictions: { type: ModelType.array, schemaName: 'mosaicGlobalRestriction.entry.restriction' }
		});

		builder.addSchema('mosaicGlobalRestriction.entry.restriction', {
			key: ModelType.uint64,
			restriction: { type: ModelType.object, schemaName: 'mosaicGlobalRestriction.entry.restriction.restriction' }
		});

		builder.addSchema('mosaicGlobalRestriction.entry.restriction.restriction', {
			referenceMosaicId: ModelType.uint64HexIdentifier,
			restrictionValue: ModelType.uint64
		});

		builder.addSchema('mosaicRestriction.mosaicAddressRestriction', {
			mosaicRestrictionEntry: { type: ModelType.object, schemaName: 'mosaicAddressRestriction.entry' }
		});

		builder.addSchema('mosaicAddressRestriction.entry', {
			compositeHash: ModelType.binary,
			mosaicId: ModelType.uint64HexIdentifier,
			targetAddress: ModelType.binary,
			restrictions: { type: ModelType.array, schemaName: 'mosaicAddressRestriction.entry.restriction' }
		});

		builder.addSchema('mosaicAddressRestriction.entry.restriction', {
			key: ModelType.uint64,
			value: ModelType.uint64
		});
	},

	registerCodecs: codecBuilder => {
		// account restrictions address
		codecBuilder.addTransactionSupport(
			EntityType.accountRestrictionAddress,
			accountRestrictionsCreateBaseCodec({
				deserializeValue: parser => parser.buffer(constants.sizes.addressDecoded),
				serializeValue: (serializer, value) => serializer.writeBuffer(value)
			})
		);

		// account restrictions mosaic
		codecBuilder.addTransactionSupport(
			EntityType.accountRestrictionMosaic,
			accountRestrictionsCreateBaseCodec({
				deserializeValue: parser => parser.uint64(),
				serializeValue: (serializer, value) => serializer.writeUint64(value)
			})
		);

		// account restrictions operation
		codecBuilder.addTransactionSupport(
			EntityType.accountRestrictionOperation,
			accountRestrictionsCreateBaseCodec({
				deserializeValue: parser => parser.uint16(),
				serializeValue: (serializer, value) => serializer.writeUint16(value)
			})
		);

		// mosaic restrictions address
		codecBuilder.addTransactionSupport(EntityType.mosaicRestrictionAddress, {
			deserialize: parser => {
				const transaction = {};
				transaction.mosaicId = parser.uint64();
				transaction.restrictionKey = parser.uint64();
				transaction.targetAddress = parser.buffer(constants.sizes.addressDecoded);
				transaction.previousRestrictionValue = parser.uint64();
				transaction.newRestrictionValue = parser.uint64();
				return transaction;
			},

			serialize: (transaction, serializer) => {
				serializer.writeUint64(transaction.mosaicId);
				serializer.writeUint64(transaction.restrictionKey);
				serializer.writeBuffer(transaction.targetAddress);
				serializer.writeUint64(transaction.previousRestrictionValue);
				serializer.writeUint64(transaction.newRestrictionValue);
			}
		});

		// mosaic restrictions global
		codecBuilder.addTransactionSupport(EntityType.mosaicRestrictionGlobal, {
			deserialize: parser => {
				const transaction = {};
				transaction.mosaicId = parser.uint64();
				transaction.referenceMosaicId = parser.uint64();
				transaction.restrictionKey = parser.uint64();
				transaction.previousRestrictionValue = parser.uint64();
				transaction.previousRestrictionType = parser.uint8();
				transaction.newRestrictionValue = parser.uint64();
				transaction.newRestrictionType = parser.uint8();
				return transaction;
			},

			serialize: (transaction, serializer) => {
				serializer.writeUint64(transaction.mosaicId);
				serializer.writeUint64(transaction.referenceMosaicId);
				serializer.writeUint64(transaction.restrictionKey);
				serializer.writeUint64(transaction.previousRestrictionValue);
				serializer.writeUint8(transaction.previousRestrictionType);
				serializer.writeUint64(transaction.newRestrictionValue);
				serializer.writeUint8(transaction.newRestrictionType);
			}
		});
	}
};

module.exports = restrictionsPlugin;
