// delay function
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const updateSum = (old: number, toAdd: number) => {
    return old + toAdd;
}