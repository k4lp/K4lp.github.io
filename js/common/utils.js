/**
 * Enhanced Utility Functions
 * Common utility functions for calculations, validations, and data processing
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.1.0 - Enhanced Digikey/Mouser pricing with packaging considerations
 */

class UtilityManager {
    constructor() {
        this.version = '2.1.0';
        
        // Pricing calculation constants
        this.pricingDefaults = {
            defaultQuantity: 1,
            maxQuantity: 1000000,
            decimalPrecision: 6
        };
        
        // Digikey packaging types and fees
        this.digikeyPackaging = {
            'Cut Tape': { code: 'CT', fee: 0, minQty: 1, description: 'Individual pieces cut from tape' },
            'Tape & Reel': { code: 'TR', fee: 0, minQty: 'varies', description: 'Full manufacturer reel' },
            'Digi-Reel': { code: 'DKR', fee: 7.00, minQty: 1, description: 'Custom reel with $7 fee' },
            'Bulk': { code: 'BLK', fee: 0, minQty: 'varies', description: 'Bulk packaging' },
            'Tube': { code: 'TB', fee: 0, minQty: 'varies', description: 'Tube packaging' },
            'Tray': { code: 'TY', fee: 0, minQty: 'varies', description: 'Tray packaging' }
        };
        
        // Validation patterns
        this.patterns = {
            partNumber: /^[A-Z0-9\-_\.]{2,50}$/i,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
            url: /^https?:\/\/[^\s]+$/,
            alphanumeric: /^[A-Z0-9]+$/i,
            numeric: /^\d+(\.\d+)?$/,
            hexColor: /^#[0-9A-F]{6}$/i
        };
        
        // Common data transformations
        this.transformations = {
            currency: {
                USD: { symbol: '$', position: 'before' },
                EUR: { symbol: '€', position: 'after' },
                GBP: { symbol: '£', position: 'before' },
                JPY: { symbol: '¥', position: 'before' },
                INR: { symbol: '₹', position: 'before' }
            }
        };
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize utility manager
     */
    initialize() {
        console.log('✓ K4LP Utility Manager v2.1.0 (Enhanced Digikey/Mouser pricing) initialized');
    }

    /**
     * Calculate Digikey unit price with packaging considerations
     * Digikey has complex pricing with multiple packaging options per part
     */
    calculateDigikeyUnitPrice(product, quantity, preferredPackaging = null) {
        try {
            if (!product || quantity <= 0) {
                return { unitPrice: 0, error: 'Invalid product or quantity' };
            }

            // Get all available packaging options for this product
            const packagingOptions = this.extractDigikeyPackagingOptions(product);
            
            if (packagingOptions.length === 0) {
                return { unitPrice: 0, error: 'No packaging options available' };
            }

            // Find the best pricing option for the requested quantity
            const bestOption = this.findBestDigikeyPackaging(packagingOptions, quantity, preferredPackaging);
            
            if (!bestOption) {
                return { unitPrice: 0, error: 'No suitable packaging option found' };
            }

            // Calculate final pricing including packaging fees
            const pricingResult = this.calculateDigikeyFinalPrice(bestOption, quantity);
            
            return {
                unitPrice: pricingResult.unitPrice,
                totalPrice: pricingResult.totalPrice,
                packaging: bestOption.packaging,
                packagingFee: pricingResult.packagingFee,
                selectedTier: bestOption.selectedTier,
                allOptions: packagingOptions,
                breakdown: pricingResult.breakdown,
                savings: pricingResult.savings,
                recommendations: this.getDigikeyQuantityRecommendations(packagingOptions, quantity)
            };
            
        } catch (error) {
            return { unitPrice: 0, error: `Digikey calculation error: ${error.message}` };
        }
    }

    /**
     * Extract all packaging options from Digikey product data
     */
    extractDigikeyPackagingOptions(product) {
        const options = [];
        
        // Handle both StandardPricing and MyPricing
        const pricingSources = [];
        
        if (product.StandardPricing && Array.isArray(product.StandardPricing)) {
            pricingSources.push({ type: 'standard', pricing: product.StandardPricing });
        }
        
        if (product.MyPricing && Array.isArray(product.MyPricing)) {
            pricingSources.push({ type: 'customer', pricing: product.MyPricing });
        }
        
        // Handle AlternatePackaging (different packaging types for same part)
        if (product.AlternatePackaging && Array.isArray(product.AlternatePackaging)) {
            product.AlternatePackaging.forEach(altPackage => {
                if (altPackage.StandardPricing) {
                    pricingSources.push({ 
                        type: 'alternate_standard', 
                        pricing: altPackage.StandardPricing,
                        packaging: altPackage.Packaging,
                        partNumber: altPackage.DigiKeyPartNumber
                    });
                }
                if (altPackage.MyPricing) {
                    pricingSources.push({ 
                        type: 'alternate_customer', 
                        pricing: altPackage.MyPricing,
                        packaging: altPackage.Packaging,
                        partNumber: altPackage.DigiKeyPartNumber
                    });
                }
            });
        }
        
        // Process each pricing source
        pricingSources.forEach(source => {
            const packaging = source.packaging || product.Packaging || { Name: 'Unknown' };
            const packagingName = packaging.Name || 'Unknown';
            
            // Get packaging configuration
            const packagingConfig = this.getPackagingConfig(packagingName);
            
            // Create price tiers
            const priceTiers = source.pricing.map(tier => ({
                quantity: parseInt(tier.BreakQuantity) || 0,
                unitPrice: parseFloat(tier.UnitPrice) || 0,
                totalPrice: parseFloat(tier.TotalPrice) || 0
            })).filter(tier => tier.quantity > 0);
            
            if (priceTiers.length > 0) {
                options.push({
                    packaging: packagingName,
                    packagingCode: packagingConfig.code,
                    packagingFee: packagingConfig.fee,
                    pricingType: source.type,
                    partNumber: source.partNumber || product.DigiKeyPartNumber,
                    priceTiers: priceTiers.sort((a, b) => a.quantity - b.quantity),
                    minimumQuantity: Math.min(...priceTiers.map(t => t.quantity))
                });
            }
        });
        
        return options;
    }

    /**
     * Get packaging configuration by name
     */
    getPackagingConfig(packagingName) {
        // Normalize packaging name
        const normalized = packagingName.toLowerCase();
        
        if (normalized.includes('cut tape') || normalized.includes('ct')) {
            return this.digikeyPackaging['Cut Tape'];
        } else if (normalized.includes('digi-reel') || normalized.includes('dkr')) {
            return this.digikeyPackaging['Digi-Reel'];
        } else if (normalized.includes('tape') && normalized.includes('reel')) {
            return this.digikeyPackaging['Tape & Reel'];
        } else if (normalized.includes('bulk')) {
            return this.digikeyPackaging['Bulk'];
        } else if (normalized.includes('tube')) {
            return this.digikeyPackaging['Tube'];
        } else if (normalized.includes('tray')) {
            return this.digikeyPackaging['Tray'];
        }
        
        // Default to unknown with no fee
        return { code: 'UNK', fee: 0, minQty: 1, description: 'Unknown packaging' };
    }

    /**
     * Find the best packaging option for a given quantity
     */
    findBestDigikeyPackaging(packagingOptions, quantity, preferredPackaging = null) {
        let bestOption = null;
        let bestPrice = Infinity;
        
        packagingOptions.forEach(option => {
            // Skip if preferred packaging is specified and this doesn't match
            if (preferredPackaging && option.packaging !== preferredPackaging) {
                return;
            }
            
            // Find the appropriate price tier for this quantity
            const selectedTier = this.findPriceTier(option.priceTiers, quantity);
            
            if (selectedTier) {
                // Calculate total cost including packaging fees
                const packagingFeePerUnit = option.packagingFee > 0 ? option.packagingFee / quantity : 0;
                const effectiveUnitPrice = selectedTier.unitPrice + packagingFeePerUnit;
                const totalCost = effectiveUnitPrice * quantity;
                
                // Prefer customer pricing over standard pricing
                const priority = option.pricingType.includes('customer') ? 0 : 1;
                const score = totalCost + (priority * 0.001); // Small penalty for non-customer pricing
                
                if (score < bestPrice) {
                    bestPrice = score;
                    bestOption = {
                        ...option,
                        selectedTier: selectedTier,
                        effectiveUnitPrice: effectiveUnitPrice,
                        totalCost: totalCost
                    };
                }
            }
        });
        
        return bestOption;
    }

    /**
     * Find the appropriate price tier for a given quantity
     */
    findPriceTier(priceTiers, quantity) {
        if (!priceTiers || priceTiers.length === 0) return null;
        
        // Sort tiers by quantity (should already be sorted)
        const sortedTiers = priceTiers.sort((a, b) => a.quantity - b.quantity);
        
        // Find the highest tier where quantity >= tier.quantity
        let selectedTier = sortedTiers[0];
        
        for (const tier of sortedTiers) {
            if (quantity >= tier.quantity) {
                selectedTier = tier;
            } else {
                break;
            }
        }
        
        return selectedTier;
    }

    /**
     * Calculate final Digikey pricing including all fees
     */
    calculateDigikeyFinalPrice(option, quantity) {
        const baseCost = option.selectedTier.unitPrice * quantity;
        const packagingFee = option.packagingFee;
        const packagingFeePerUnit = packagingFee > 0 ? packagingFee / quantity : 0;
        
        const totalCost = baseCost + packagingFee;
        const unitPrice = totalCost / quantity;
        
        // Calculate savings vs first tier
        const firstTier = option.priceTiers[0];
        const firstTierTotal = (firstTier.unitPrice * quantity) + packagingFee;
        const savings = {
            absolute: Math.max(0, firstTierTotal - totalCost),
            percentage: firstTierTotal > 0 ? Math.max(0, ((firstTierTotal - totalCost) / firstTierTotal) * 100) : 0
        };
        
        return {
            unitPrice: unitPrice,
            totalPrice: totalCost,
            packagingFee: packagingFee,
            packagingFeePerUnit: packagingFeePerUnit,
            baseCost: baseCost,
            savings: savings,
            breakdown: {
                quantity: quantity,
                baseUnitPrice: option.selectedTier.unitPrice,
                baseCost: baseCost,
                packagingFee: packagingFee,
                totalCost: totalCost,
                finalUnitPrice: unitPrice
            }
        };
    }

    /**
     * Get quantity recommendations for Digikey products
     */
    getDigikeyQuantityRecommendations(packagingOptions, targetQuantity) {
        const recommendations = [];
        
        packagingOptions.forEach(option => {
            option.priceTiers.forEach(tier => {
                const packagingFeePerUnit = option.packagingFee > 0 ? option.packagingFee / tier.quantity : 0;
                const effectiveUnitPrice = tier.unitPrice + packagingFeePerUnit;
                const totalCost = effectiveUnitPrice * tier.quantity;
                
                recommendations.push({
                    quantity: tier.quantity,
                    unitPrice: effectiveUnitPrice,
                    totalCost: totalCost,
                    packaging: option.packaging,
                    packagingFee: option.packagingFee,
                    baseUnitPrice: tier.unitPrice,
                    costPerTargetQuantity: effectiveUnitPrice * targetQuantity,
                    efficiency: 1 / effectiveUnitPrice,
                    suitable: tier.quantity >= targetQuantity
                });
            });
        });
        
        // Sort by cost efficiency for target quantity
        return recommendations
            .sort((a, b) => a.costPerTargetQuantity - b.costPerTargetQuantity)
            .slice(0, 10); // Top 10 recommendations
    }

    /**
     * Calculate unit price based on quantity and price breaks (Mouser method)
     * Mouser has simpler pricing structure compared to Digikey
     */
    calculateMouserUnitPrice(priceBreaks, quantity) {
        try {
            if (!priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
                return { unitPrice: 0, error: 'No price breaks available' };
            }
            
            if (!quantity || quantity <= 0) {
                return { unitPrice: 0, error: 'Invalid quantity' };
            }
            
            // Parse Mouser price breaks (they might have currency symbols)
            const parsedBreaks = priceBreaks.map(pb => ({
                quantity: parseInt(pb.quantity || pb.Quantity) || 0,
                unitPrice: this.parsePrice(pb.unitPrice || pb.Price || '0')
            })).filter(pb => pb.quantity > 0 && pb.unitPrice >= 0);
            
            if (parsedBreaks.length === 0) {
                return { unitPrice: 0, error: 'No valid price breaks found' };
            }
            
            // Sort by quantity (ascending)
            const sortedBreaks = parsedBreaks.sort((a, b) => a.quantity - b.quantity);
            
            // Find the appropriate price tier
            let selectedBreak = sortedBreaks[0];
            
            for (const priceBreak of sortedBreaks) {
                if (quantity >= priceBreak.quantity) {
                    selectedBreak = priceBreak;
                } else {
                    break;
                }
            }
            
            return {
                unitPrice: selectedBreak.unitPrice,
                totalPrice: selectedBreak.unitPrice * quantity,
                selectedTier: selectedBreak,
                savings: this.calculateSavings(sortedBreaks[0], selectedBreak, quantity),
                nextTier: this.findNextTier(sortedBreaks, selectedBreak),
                allTiers: sortedBreaks,
                recommendations: this.getOptimalQuantityRecommendations(sortedBreaks, quantity)
            };
            
        } catch (error) {
            return { unitPrice: 0, error: `Mouser calculation error: ${error.message}` };
        }
    }

    /**
     * Parse price string and extract numeric value
     */
    parsePrice(priceString) {
        if (typeof priceString === 'number') {
            return priceString;
        }
        
        if (typeof priceString !== 'string') {
            return 0;
        }
        
        // Remove currency symbols and whitespace
        const cleanPrice = priceString
            .replace(/[$£€¥₹,\s]/g, '')
            .replace(/[^\d\.]/g, '');
        
        const parsed = parseFloat(cleanPrice);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Calculate savings between price tiers
     */
    calculateSavings(baseTier, selectedTier, quantity) {
        if (!baseTier || !selectedTier || quantity <= 0) {
            return { absolute: 0, percentage: 0 };
        }
        
        const baseTotal = baseTier.unitPrice * quantity;
        const selectedTotal = selectedTier.unitPrice * quantity;
        const absoluteSavings = baseTotal - selectedTotal;
        const percentageSavings = baseTotal > 0 ? (absoluteSavings / baseTotal) * 100 : 0;
        
        return {
            absolute: Math.max(0, absoluteSavings),
            percentage: Math.max(0, percentageSavings)
        };
    }

    /**
     * Find the next available price tier
     */
    findNextTier(sortedBreaks, currentTier) {
        const currentIndex = sortedBreaks.findIndex(pb => 
            pb.quantity === currentTier.quantity && pb.unitPrice === currentTier.unitPrice
        );
        
        if (currentIndex >= 0 && currentIndex < sortedBreaks.length - 1) {
            return sortedBreaks[currentIndex + 1];
        }
        
        return null;
    }

    /**
     * Get optimal quantity recommendations based on price breaks
     */
    getOptimalQuantityRecommendations(priceBreaks, targetQuantity) {
        try {
            if (!priceBreaks || !Array.isArray(priceBreaks)) {
                return [];
            }
            
            const sortedBreaks = priceBreaks
                .filter(pb => pb.quantity > 0 && pb.unitPrice >= 0)
                .sort((a, b) => a.quantity - b.quantity);
            
            const recommendations = [];
            
            sortedBreaks.forEach((priceBreak, index) => {
                // Calculate efficiency (lower unit price is better)
                const efficiency = 1 / priceBreak.unitPrice;
                
                // Calculate cost for target quantity
                const costForTarget = priceBreak.unitPrice * targetQuantity;
                
                // Calculate cost if buying at this tier quantity
                const costAtTierQuantity = priceBreak.unitPrice * priceBreak.quantity;
                const excessQuantity = Math.max(0, priceBreak.quantity - targetQuantity);
                const wastedCost = priceBreak.unitPrice * excessQuantity;
                
                recommendations.push({
                    quantity: priceBreak.quantity,
                    unitPrice: priceBreak.unitPrice,
                    costForTarget: costForTarget,
                    costAtTierQuantity: costAtTierQuantity,
                    efficiency: efficiency,
                    excessQuantity: excessQuantity,
                    wastedCost: wastedCost,
                    recommended: priceBreak.quantity >= targetQuantity,
                    isBreakpoint: true,
                    savingsVsNext: index < sortedBreaks.length - 1 ? 
                        this.calculateSavings(priceBreak, sortedBreaks[index + 1], targetQuantity) : null
                });
            });
            
            // Sort by cost efficiency for target quantity
            return recommendations.sort((a, b) => a.costForTarget - b.costForTarget);
            
        } catch (error) {
            console.error('Error calculating optimal quantities:', error);
            return [];
        }
    }

    /**
     * Compare pricing between Digikey and Mouser
     */
    comparePricing(digikeyProduct, mouserProduct, quantity) {
        const digikeyResult = this.calculateDigikeyUnitPrice(digikeyProduct, quantity);
        const mouserResult = this.calculateMouserUnitPrice(
            mouserProduct.priceBreaks || mouserProduct.PriceBreaks, 
            quantity
        );
        
        const comparison = {
            quantity: quantity,
            digikey: digikeyResult,
            mouser: mouserResult,
            winner: null,
            savings: { absolute: 0, percentage: 0 }
        };
        
        if (digikeyResult.unitPrice > 0 && mouserResult.unitPrice > 0) {
            if (digikeyResult.totalPrice < mouserResult.totalPrice) {
                comparison.winner = 'digikey';
                comparison.savings.absolute = mouserResult.totalPrice - digikeyResult.totalPrice;
                comparison.savings.percentage = (comparison.savings.absolute / mouserResult.totalPrice) * 100;
            } else if (mouserResult.totalPrice < digikeyResult.totalPrice) {
                comparison.winner = 'mouser';
                comparison.savings.absolute = digikeyResult.totalPrice - mouserResult.totalPrice;
                comparison.savings.percentage = (comparison.savings.absolute / digikeyResult.totalPrice) * 100;
            } else {
                comparison.winner = 'tie';
            }
        } else if (digikeyResult.unitPrice > 0) {
            comparison.winner = 'digikey';
        } else if (mouserResult.unitPrice > 0) {
            comparison.winner = 'mouser';
        }
        
        return comparison;
    }

    /**
     * Extract and normalize product attributes/parameters
     */
    extractProductAttributes(product, provider) {
        try {
            const attributes = {
                basic: {},
                electrical: {},
                physical: {},
                compliance: {},
                other: {}
            };
            
            let rawParameters = [];
            
            // Extract parameters based on provider
            if (provider === 'digikey' && product.Parameters) {
                rawParameters = product.Parameters;
            } else if (provider === 'mouser' && product.ProductAttributes) {
                rawParameters = product.ProductAttributes;
            } else if (product.parameters) {
                // Already normalized
                return this.categorizeAttributes(product.parameters);
            }
            
            // Normalize parameter format
            rawParameters.forEach(param => {
                let name, value, unit;
                
                if (provider === 'digikey') {
                    name = param.Parameter;
                    value = param.Value;
                    unit = param.ValueId || '';
                } else if (provider === 'mouser') {
                    name = param.AttributeName;
                    value = param.AttributeValue;
                    unit = param.AttributeUnit || '';
                }
                
                if (name && value) {
                    const category = this.categorizeParameter(name);
                    attributes[category][name] = {
                        value: value,
                        unit: unit,
                        displayValue: unit ? `${value} ${unit}` : value
                    };
                }
            });
            
            return attributes;
            
        } catch (error) {
            console.error('Error extracting product attributes:', error);
            return { basic: {}, electrical: {}, physical: {}, compliance: {}, other: {} };
        }
    }

    /**
     * Categorize parameter by name
     */
    categorizeParameter(parameterName) {
        const name = parameterName.toLowerCase();
        
        // Electrical parameters
        if (name.includes('voltage') || name.includes('current') || name.includes('power') || 
            name.includes('resistance') || name.includes('capacitance') || name.includes('inductance') ||
            name.includes('frequency') || name.includes('impedance') || name.includes('gain') ||
            name.includes('tolerance') || name.includes('esr') || name.includes('ripple')) {
            return 'electrical';
        }
        
        // Physical parameters
        if (name.includes('size') || name.includes('dimension') || name.includes('length') ||
            name.includes('width') || name.includes('height') || name.includes('diameter') ||
            name.includes('weight') || name.includes('package') || name.includes('mounting') ||
            name.includes('case') || name.includes('footprint')) {
            return 'physical';
        }
        
        // Compliance parameters
        if (name.includes('rohs') || name.includes('lead') || name.includes('halogen') ||
            name.includes('compliance') || name.includes('standard') || name.includes('certification') ||
            name.includes('reach') || name.includes('environmental')) {
            return 'compliance';
        }
        
        // Basic parameters
        if (name.includes('manufacturer') || name.includes('part') || name.includes('series') ||
            name.includes('category') || name.includes('family') || name.includes('type') ||
            name.includes('status') || name.includes('description')) {
            return 'basic';
        }
        
        return 'other';
    }

    /**
     * Categorize already normalized attributes
     */
    categorizeAttributes(parameters) {
        const attributes = {
            basic: {},
            electrical: {},
            physical: {},
            compliance: {},
            other: {}
        };
        
        Object.entries(parameters).forEach(([name, data]) => {
            const category = this.categorizeParameter(name);
            attributes[category][name] = data;
        });
        
        return attributes;
    }

    /**
     * Search and filter attributes
     */
    searchAttributes(attributes, searchTerm) {
        if (!searchTerm) return attributes;
        
        const filtered = {
            basic: {},
            electrical: {},
            physical: {},
            compliance: {},
            other: {}
        };
        
        const lowerSearch = searchTerm.toLowerCase();
        
        Object.entries(attributes).forEach(([category, params]) => {
            Object.entries(params).forEach(([name, data]) => {
                if (name.toLowerCase().includes(lowerSearch) || 
                    data.value.toString().toLowerCase().includes(lowerSearch)) {
                    filtered[category][name] = data;
                }
            });
        });
        
        return filtered;
    }

    /**
     * Format currency with proper symbols and localization
     */
    formatCurrency(amount, currency = 'USD', options = {}) {
        try {
            const {
                showSymbol = true,
                precision = 2,
                showZero = true
            } = options;
            
            if (amount === 0 && !showZero) {
                return 'N/A';
            }
            
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: precision,
                maximumFractionDigits: Math.max(precision, 4) // Allow up to 4 decimals for small amounts
            });
            
            return formatter.format(amount);
            
        } catch (error) {
            // Fallback formatting
            const symbol = this.transformations.currency[currency]?.symbol || '$';
            return showSymbol ? `${symbol}${amount.toFixed(4)}` : amount.toFixed(4);
        }
    }

    /**
     * Format large numbers with appropriate units (K, M, B)
     */
    formatLargeNumber(number, precision = 1) {
        if (number < 1000) {
            return number.toString();
        }
        
        const units = ['', 'K', 'M', 'B', 'T'];
        const tier = Math.floor(Math.log10(Math.abs(number)) / 3);
        
        if (tier === 0) return number.toString();
        
        const unit = units[tier] || units[units.length - 1];
        const scale = Math.pow(10, tier * 3);
        const scaled = number / scale;
        
        return scaled.toFixed(precision) + unit;
    }

    /**
     * Create pricing summary for display
     */
    createPricingSummary(pricingResult, quantity) {
        if (!pricingResult || pricingResult.error) {
            return {
                error: pricingResult?.error || 'Unknown pricing error',
                displayPrice: 'N/A',
                breakdown: null
            };
        }

        const summary = {
            unitPrice: pricingResult.unitPrice,
            totalPrice: pricingResult.totalPrice,
            quantity: quantity,
            displayPrice: this.formatCurrency(pricingResult.unitPrice),
            displayTotal: this.formatCurrency(pricingResult.totalPrice),
            packaging: pricingResult.packaging,
            savings: pricingResult.savings
        };

        // Add packaging info for Digikey
        if (pricingResult.packagingFee !== undefined) {
            summary.packagingFee = pricingResult.packagingFee;
            summary.packagingFeeDisplay = this.formatCurrency(pricingResult.packagingFee);
        }

        // Add breakdown if available
        if (pricingResult.breakdown) {
            summary.breakdown = {
                ...pricingResult.breakdown,
                baseUnitPriceDisplay: this.formatCurrency(pricingResult.breakdown.baseUnitPrice),
                baseCostDisplay: this.formatCurrency(pricingResult.breakdown.baseCost),
                totalCostDisplay: this.formatCurrency(pricingResult.breakdown.totalCost)
            };
        }

        return summary;
    }

    /**
     * Validate data using various validation rules
     */
    validate(value, rules) {
        const results = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        if (!rules || rules.length === 0) {
            return results;
        }
        
        rules.forEach(rule => {
            try {
                const ruleResult = this.applyValidationRule(value, rule);
                
                if (!ruleResult.isValid) {
                    results.isValid = false;
                    results.errors.push(ruleResult.message);
                }
                
                if (ruleResult.warning) {
                    results.warnings.push(ruleResult.warning);
                }
                
            } catch (error) {
                results.isValid = false;
                results.errors.push(`Validation rule error: ${error.message}`);
            }
        });
        
        return results;
    }

    /**
     * Apply individual validation rule
     */
    applyValidationRule(value, rule) {
        const result = { isValid: true, message: '', warning: null };
        
        switch (rule.type) {
            case 'required':
                if (value === null || value === undefined || value === '') {
                    result.isValid = false;
                    result.message = rule.message || 'This field is required';
                }
                break;
                
            case 'pattern':
                if (value && !new RegExp(rule.pattern).test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid format';
                }
                break;
                
            case 'minLength':
                if (value && value.length < rule.value) {
                    result.isValid = false;
                    result.message = rule.message || `Minimum length is ${rule.value}`;
                }
                break;
                
            case 'maxLength':
                if (value && value.length > rule.value) {
                    result.isValid = false;
                    result.message = rule.message || `Maximum length is ${rule.value}`;
                }
                break;
                
            case 'range':
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && (numValue < rule.min || numValue > rule.max)) {
                    result.isValid = false;
                    result.message = rule.message || `Value must be between ${rule.min} and ${rule.max}`;
                }
                break;
                
            case 'email':
                if (value && !this.patterns.email.test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid email format';
                }
                break;
                
            case 'partNumber':
                if (value && !this.patterns.partNumber.test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid part number format';
                }
                break;
        }
        
        return result;
    }

    /**
     * Debounce function execution
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function execution
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix + '_';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Calculate hash of string (simple djb2 algorithm)
     */
    calculateHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash >>> 0; // Convert to unsigned 32-bit integer
    }

    /**
     * Compare two versions (semantic versioning)
     */
    compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        const maxLength = Math.max(v1parts.length, v2parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }

    /**
     * Get browser and device information
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        
        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            vendor: navigator.vendor,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timestamp: Date.now()
        };
    }

    /**
     * Log performance metrics
     */
    logPerformance(label, startTime) {
        if (typeof startTime === 'undefined') {
            return performance.now();
        }
        
        const duration = performance.now() - startTime;
        console.log(`⚡ Performance [${label}]: ${duration.toFixed(2)}ms`);
        return duration;
    }

    /**
     * Safe JSON parse with error handling
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return defaultValue;
        }
    }

    /**
     * Safe JSON stringify with error handling
     */
    safeJsonStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('JSON stringify error:', error);
            return defaultValue;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Unescape HTML
     */
    unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes, precision = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
    }
}

// Create and expose global instance
const utils = new UtilityManager();
window.utils = utils;

// Legacy compatibility
window.UtilityManager = UtilityManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UtilityManager;
}

console.log('✓ K4LP Utility Manager v2.1.0 (Enhanced Digikey/Mouser pricing) initialized');
