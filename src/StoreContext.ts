import { createContext, useContext } from "solid-js";

export const StoreContext = createContext<{
    settings: {
        amountOfCycleDays: number,
        amountOfMenstruationDays: number,
    }
}>()

export function useStore() {
    const context = useContext(StoreContext);
    if(!context){
        throw new Error('StoreContext is undefined');
    }
    return context;
}
