import axios from "axios";
import FormData from "form-data";

// OCR service using a free OCR API (you can replace with Google Vision, AWS Textract, etc.)
export const extractTextFromImage = async (imageBuffer, imageType = "image/jpeg") => {
    try {
        // Using OCR.space API (free tier available)
        const formData = new FormData();
        formData.append("file", imageBuffer, {
            filename: "receipt.jpg",
            contentType: imageType
        });
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("apikey", process.env.OCR_API_KEY || "helloworld"); // Free tier key

        const response = await axios.post("https://api.ocr.space/parse/image", formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        if (response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            return response.data.ParsedResults[0].ParsedText;
        }

        throw new Error("No text found in image");
    } catch (error) {
        console.error("OCR Error:", error);
        throw error;
    }
};

// Parse receipt data from OCR text
export const parseReceiptData = (ocrText) => {
    try {
        const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let merchantName = "";
        let totalAmount = 0;
        let date = null;
        const items = [];

        // Extract merchant name (usually first line or line with common business indicators)
        const businessIndicators = ["restaurant", "cafe", "store", "shop", "hotel", "gas", "station"];
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (businessIndicators.some(indicator => lowerLine.includes(indicator))) {
                merchantName = line;
                break;
            }
        }

        // Extract total amount (look for patterns like $XX.XX, XX.XX, etc.)
        const amountPattern = /[\$€£¥]?(\d+\.?\d*)/g;
        const amounts = [];
        
        for (const line of lines) {
            const matches = line.match(amountPattern);
            if (matches) {
                amounts.push(...matches.map(match => parseFloat(match.replace(/[\$€£¥]/g, ''))));
            }
        }

        // The largest amount is likely the total
        if (amounts.length > 0) {
            totalAmount = Math.max(...amounts);
        }

        // Extract date (look for date patterns)
        const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (dateMatch) {
                date = new Date(dateMatch[0]);
                break;
            }
        }

        // Extract individual items (lines that look like items with prices)
        for (const line of lines) {
            const hasAmount = line.match(amountPattern);
            if (hasAmount && !line.toLowerCase().includes("total") && !line.toLowerCase().includes("subtotal")) {
                const amount = parseFloat(hasAmount[0].replace(/[\$€£¥]/g, ''));
                if (amount > 0 && amount < totalAmount) {
                    items.push({
                        description: line.replace(amountPattern, '').trim(),
                        amount: amount
                    });
                }
            }
        }

        return {
            merchantName: merchantName || "Unknown Merchant",
            totalAmount,
            date: date || new Date(),
            items,
            extracted: true
        };
    } catch (error) {
        console.error("Error parsing receipt data:", error);
        return {
            merchantName: "Unknown Merchant",
            totalAmount: 0,
            date: new Date(),
            items: [],
            extracted: false
        };
    }
};

// Process receipt image and extract expense data
export const processReceiptImage = async (imageBuffer, imageType) => {
    try {
        // Extract text using OCR
        const ocrText = await extractTextFromImage(imageBuffer, imageType);
        
        // Parse the extracted text
        const parsedData = parseReceiptData(ocrText);
        
        return {
            success: true,
            ocrText,
            parsedData
        };
    } catch (error) {
        console.error("Error processing receipt image:", error);
        return {
            success: false,
            error: error.message,
            parsedData: {
                merchantName: "Unknown Merchant",
                totalAmount: 0,
                date: new Date(),
                items: [],
                extracted: false
            }
        };
    }
};
