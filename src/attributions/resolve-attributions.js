const _ = require('lodash');
const getEntityDefinitions = require('./get-entity-definitions');

const prettifyUndefined = value => (value === undefined ? '(none)' : value);

const getErrorForDuplicate = (type, metadata) => {
  const {
    affiliateAddress,
    bridgeAddress,
    feeRecipientAddress,
    senderAddress,
    source,
    takerAddress,
    tradeType,
    transactionToAddress,
  } = metadata;

  return new Error(
    `Multiple ${type} attribution entities match metadata:` +
      '\r\n\r\n' +
      `affiliateAddress: ${prettifyUndefined(affiliateAddress)}\r\n` +
      `bridgeAddress: ${prettifyUndefined(bridgeAddress)}\r\n` +
      `feeRecipientAddress: ${prettifyUndefined(feeRecipientAddress)}\r\n` +
      `senderAddress: ${prettifyUndefined(senderAddress)}\r\n` +
      `source: ${prettifyUndefined(source)}\r\n` +
      `takerAddress: ${prettifyUndefined(takerAddress)}\r\n` +
      `tradeType: ${prettifyUndefined(tradeType)}\r\n` +
      `transactionToAddress: ${prettifyUndefined(transactionToAddress)}`,
  );
};

const sanitizeMetadata = metadata => ({
  affiliateAddress: metadata.affiliateAddress || null,
  bridgeAddress: metadata.bridgeAddress || null,
  feeRecipientAddress: metadata.feeRecipientAddress || null,
  senderAddress: metadata.senderAddress || null,
  source: metadata.source || null,
  takerAddress: metadata.takerAddress || null,
  tradeType: metadata.tradeType || null,
  transactionToAddress: metadata.transactionToAddress || null,
});

const resolveAttributions = metadata => {
  const {
    affiliateAddress,
    bridgeAddress,
    feeRecipientAddress,
    senderAddress,
    source,
    takerAddress,
    tradeType,
    transactionToAddress,
  } = sanitizeMetadata(metadata);

  const entityDefinitions = getEntityDefinitions();
  const mappings = _.flatMap(entityDefinitions, d => d.mappings);

  const matches = mappings.filter(
    mapping =>
      (mapping.affiliateAddress === affiliateAddress ||
        mapping.affiliateAddress === undefined) &&
      (mapping.feeRecipientAddress === feeRecipientAddress ||
        mapping.feeRecipientAddress === undefined) &&
      (mapping.takerAddress === takerAddress ||
        mapping.takerAddress === undefined) &&
      (mapping.senderAddress === senderAddress ||
        mapping.senderAddress === undefined) &&
      (mapping.transactionToAddress === transactionToAddress ||
        mapping.transactionToAddress === undefined) &&
      (mapping.source === source || mapping.source === undefined) &&
      (mapping.bridgeAddress === bridgeAddress ||
        mapping.bridgeAddress === undefined) &&
      (mapping.tradeType === tradeType || mapping.tradeType === undefined),
  );

  const attributions = _.uniqWith(
    matches.map(match => {
      const definition = entityDefinitions.find(d =>
        d.mappings.includes(match),
      );

      return {
        id: definition.id,
        type: match.type,
      };
    }),
    _.isEqual,
  );

  // TODO: Make this guard dynamic based on types constant
  if (attributions.filter(a => a.type === 'relayer').length > 1) {
    throw getErrorForDuplicate('relayer', metadata);
  }

  if (attributions.filter(a => a.type === 'consumer').length > 1) {
    throw getErrorForDuplicate('consumer', metadata);
  }

  if (attributions.filter(a => a.type === 'liquidity-source').length > 1) {
    throw getErrorForDuplicate('liquidity-source', metadata);
  }

  return _.sortBy(attributions, x => x.type);
};

module.exports = resolveAttributions;
