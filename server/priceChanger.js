// Take a price, and change it. Will evolve over time as Ethan develops the price change algorithm.

//example data, for more robust equation
let proportionalTerm = 5;  //Sharpness of price function, top and bottom
let integralTerm = .2; //Swing of equation, grows speed as its farther off

let demandReactivity = 0.1; //How sharply the demands reacts, .1 is slow, .4 is fast
let basePrice = 200; //Base Price of the good
let price = 200; //Current Price of the good
let demandScale = 2; //Scale of how much the price function

let demandCarryover = 1; //Test Variable
let integralCarryover = 0; //Test Variable
let priceCarryover = 200; //Test Variable

demandSetPoint = 1.2; //Test Variable  

function calculateNewPricePlaceholder(oldPrice) {
    const randomChange = .1 * (Math.random() * 2 - 1);
    const adjustedPrice = oldPrice * (1 + randomChange);
    return Math.round(adjustedPrice,2);
  }

  function roundToThree(num) { //rounds a number to three places, two decimals
    const factor = Math.pow(10, 2);
    return Math.round(num * factor) / factor;
}

function calculateNewPrice(basePrice,price, demandSetPoint,demand,integral, iterm, pterm, demandReactivity, demandScale) {
    //console.log("Price:", priceCarryover, " Demand: ", demandCarryover, " DemandSP: ", demandSetPoint, " Integral: ",integralCarryover);
    let error = demandSetPoint - demand;
    let integralNew = integral + (error * iterm);
    let demandNew = demandScale * (1/(1 + Math.exp(-demandReactivity * (price-basePrice))));
    
    priceNew = Math.max(basePrice * 0.1, price + pterm*error + iterm * integral);

    demandNew = roundToThree(demandNew);
    integralNew = roundToThree(integralNew);
    priceNew = roundToThree(priceNew);
    

    return {
      price: priceNew,
      demand: demandNew,
      integral: integralNew
    }
    
    
}

//calculateNewPrice(basePrice, 1.7, 1.3, 0, integralTerm, proportionalTerm, demandReactivity, demandScale);
// for (let i = 0; i < 10; i++) {
//     demandSetPoint = roundToThree(demandSetPoint + (Math.random() * 0.6) - 0.3)
//     for (let i = 0; i < 10; i++){
//       calculateNewPrice(basePrice,priceCarryover, demandSetPoint, demandCarryover, integralCarryover, integralTerm, proportionalTerm, demandReactivity, demandScale);
//     }
// }

  module.exports = calculateNewPrice;