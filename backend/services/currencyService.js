import axios from "axios";

// Get all countries and their currencies
export const getCountriesAndCurrencies = async () => {
    try {
        const response = await axios.get("https://restcountries.com/v3.1/all?fields=name,currencies");
        return response.data;
    } catch (error) {
        console.error("Error fetching countries:", error);
        throw error;
    }
};

// Convert currency using exchange rate API
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    try {
        if (fromCurrency === toCurrency) {
            return {
                convertedAmount: amount,
                exchangeRate: 1
            };
        }

        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        const rates = response.data.rates;
        const exchangeRate = rates[toCurrency];

        if (!exchangeRate) {
            throw new Error(`Exchange rate not found for ${toCurrency}`);
        }

        const convertedAmount = amount * exchangeRate;

        return {
            convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
            exchangeRate: Math.round(exchangeRate * 10000) / 10000 // Round to 4 decimal places
        };
    } catch (error) {
        console.error("Error converting currency:", error);
        throw error;
    }
};

// Get exchange rates for a base currency
export const getExchangeRates = async (baseCurrency = "USD") => {
    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        throw error;
    }
};
