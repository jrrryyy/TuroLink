let validatorsPromise = null;

async function loadValidators() {
  if (validatorsPromise) return validatorsPromise;
  try {
    validatorsPromise = await import('../shared/validation.mjs');
    return validatorsPromise;
  } catch {
    validatorsPromise = await import('../../shared/validation.mjs');
    return validatorsPromise;
  }
}

module.exports = { loadValidators };
