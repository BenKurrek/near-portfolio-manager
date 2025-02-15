import { delay } from "./utils";

// works first try
export const mockFn1 = async () => {
    // wait 1 second then return value
    await delay(1000);
    return {message: "step 1 complete", value: 5};
}

// high failure rate
export const mockFn2 = async () => {
    // // wait 3 seconds to process
    // await delay(3000);

    // // randomly determine if it fails or not, 70% chance to fail
    // if(Math.random() < 0.6){
    //     throw new Error("step 2 failed");
    // }else{
    //     return {message: "step 2 complete", value: 3};
    // }

    throw new Error("step 2 failed");
}

// works every time
export const mockFn3 = async () => {
    // wait 5 seconds then return value
    await delay(5000);
    return {message: "step 3 complete", value: 2};
}