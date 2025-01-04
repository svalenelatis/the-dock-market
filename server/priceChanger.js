// Take a price, and change it. Will evolve over time as Ethan develops the price change algorithm.

function calculateNewPricePlaceholder(oldPrice) {
    const randomChange = .025 * (Math.random() * 2 - 1);
    const adjustedPrice = oldPrice * (1 + randomChange);
    return Math.round(adjustedPrice,2);
  }

  module.exports = calculateNewPricePlaceholder;