// Take a price, and change it. Will evolve over time as Ethan develops the price change algorithm.

//example data, for more robust equation
let proportionalTerm = 5;
let integralTerm = .2;

let demandReactivity = 0.1;
let basePrice = 200;
let price = 200;
let demandScale = 2;

let demandCarryover = 1;
let integralCarryover = 0;
let priceCarryover = 200;

demandSetPoint = 1.2;

function calculateNewPricePlaceholder(oldPrice) {
    const randomChange = .1 * (Math.random() * 2 - 1);
    const adjustedPrice = oldPrice * (1 + randomChange);
    return Math.round(adjustedPrice,2);
  }

  function roundToThree(num) { //rounds a number to two decimal places
    const factor = Math.pow(10, 2);
    return Math.round(num * factor) / factor;
}

function calculateNewPrice(basePrice,price, demandSetPoint,demand,integral, iterm, pterm, demandReactivity, demandScale) {
    console.log("Price:", priceCarryover, " Demand: ", demandCarryover, " DemandSP: ", demandSetPoint, " Integral: ",integralCarryover);
    let error = demandSetPoint - demand;
    //console.log("error: " + error);
    let integralNew = integral + (error * iterm);
    //console.log("integralNew: " + integralNew);
    let demandNew = demandScale * (1/(1 + Math.exp(-demandReactivity * (price-basePrice))));
    
    priceNew = price + pterm*error + iterm * integral

    demandCarryover = roundToThree(demandNew);
    integralCarryover = roundToThree(integralNew);
    priceCarryover = roundToThree(priceNew);

    
    
}

//calculateNewPrice(basePrice, 1.7, 1.3, 0, integralTerm, proportionalTerm, demandReactivity, demandScale);
for (let i = 0; i < 10; i++) {
    demandSetPoint = roundToThree(demandSetPoint + (Math.random() * 0.6) - 0.3)
    for (let i = 0; i < 10; i++){
      calculateNewPrice(basePrice,priceCarryover, demandSetPoint, demandCarryover, integralCarryover, integralTerm, proportionalTerm, demandReactivity, demandScale);
    }
}

  module.exports = calculateNewPricePlaceholder;