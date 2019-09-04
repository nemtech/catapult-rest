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

/** @module plugins/multisig */
const EntityType = require('../model/EntityType');
const ModelType = require('../model/ModelType');
const sizes = require('../modelBinary/sizes');
const convert = require('../utils/convert');

const constants = { sizes };

/**
 * Creates a multisig plugin.
 * @type {module:plugins/CatapultPlugin}
 */
const multisigPlugin = {
	registerSchema: builder => {
		builder.addTransactionSupport(EntityType.modifyMultisigAccount, {
			modifications: { type: ModelType.array, schemaName: 'modifyMultisigAccount.modification' }
		});
		builder.addSchema('modifyMultisigAccount.modification', {
			cosignatoryPublicKey: ModelType.binary
		});

		builder.addSchema('multisigEntry', {
			multisig: { type: ModelType.object, schemaName: 'multisigEntry.multisig' }
		});
		builder.addSchema('multisigEntry.multisig', {
			accountPublicKey: ModelType.binary,
			accountAddress: ModelType.binary,
			multisigPublicKeys: { type: ModelType.array, schemaName: ModelType.binary },
			cosignatoryPublicKeys: { type: ModelType.array, schemaName: ModelType.binary }
		});
		builder.addSchema('multisigGraph', {
			multisigEntries: { type: ModelType.array, schemaName: 'multisigEntry' }
		});
	},

	registerCodecs: codecBuilder => {
		codecBuilder.addTransactionSupport(EntityType.modifyMultisigAccount, {
			deserialize: parser => {
				const transaction = {};
				transaction.minRemovalDelta = convert.uint8ToInt8(parser.uint8());
				transaction.minApprovalDelta = convert.uint8ToInt8(parser.uint8());

				const modificationsCount = parser.uint8();
				transaction.modifications = [];

				while (transaction.modifications.length < modificationsCount) {
					const modificationAction = parser.uint8();
					const cosignatoryPublicKey = parser.buffer(constants.sizes.signerPublicKey);
					transaction.modifications.push({ modificationAction, cosignatoryPublicKey });
				}

				return transaction;
			},

			serialize: (transaction, serializer) => {
				serializer.writeUint8(convert.int8ToUint8(transaction.minRemovalDelta));
				serializer.writeUint8(convert.int8ToUint8(transaction.minApprovalDelta));
				serializer.writeUint8(transaction.modifications.length);
				transaction.modifications.forEach(modification => {
					serializer.writeUint8(modification.modificationAction);
					serializer.writeBuffer(modification.cosignatoryPublicKey);
				});
			}
		});
	}
};

module.exports = multisigPlugin;
