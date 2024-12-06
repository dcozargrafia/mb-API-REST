/**
 * Calcula la responsabilidad (liability) de una apuesta
 * 
 * @param {string} status - Estado de la apuesta
 * @param {string} betType - Tipo de apuesta
 * @param {number} stake - Cantidad apostada
 * @param {number} odds - Cuota de la apuesta
 * @returns {number} Responsabilidad calculada
 */
const calculateLiability = ( status, betType, stake, odds ) => {
    if ( status !== 'pending' ) {
        return 0;
    }

    switch ( betType ) {
        case 'layBet':
            return Number(( stake * ( odds - 1 ) ).toFixed(2));
        case 'freeBet':
            return 0;
        default:
            return Number(stake.toFixed(2));
    }
};

/**
 * Calcula la comisión sobre una ganancia
 * 
 * @param {number} profit - Ganancia antes de comisión
 * @param {number} commission - Porcentaje de comisión
 * @returns {number} Comisión calculada
 */
const calculateCommission = ( profit, commission ) => {
    return Number(( profit * ( commission / 100 ) ).toFixed(2));
};



/**
 * Calcula el resultado de una apuesta incluyendo comisiones
 * 
 * @param {string} status - Estado de la apuesta
 * @param {string} betType - Tipo de apuesta
 * @param {number} stake - Cantidad apostada
 * @param {number} odds - Cuota de la apuesta
 * @param {number} liability - Responsabilidad de la apuesta
 * @param {number} commission - Porcentaje de comisión del bookmaker
 * @returns {number} Resultado calculado
 */
const calculateResult = ( status, betType, stake, odds, liability, commission = 0 ) => {
    if ( status === 'pending' ) {
        return 0;
    }

    switch ( betType ) {
        case 'backBet':
            if ( status === 'won' ) {
                const profit = stake * ( odds - 1 );
                const commissionAmount = calculateCommission( profit, commission );
                return Number(( profit - commissionAmount ).toFixed(2));
            }
            return -Number(stake.toFixed(2));

        case 'layBet':
            if ( status === 'won' ) {
                const profit = stake;
                const commissionAmount = calculateCommission( profit, commission );
                return Number(( profit - commissionAmount ).toFixed(2));
            }
            return -Number(liability.toFixed(2));

        case 'freeBet':
            if ( status === 'won' ) {
                const profit = stake * ( odds - 1 );
                const commissionAmount = calculateCommission( profit, commission );
                return Number(( profit - commissionAmount ).toFixed(2));
            }
            return 0;

        default:
            if ( status === 'won' ) {
                const profit = stake * ( odds - 1 );
                const commissionAmount = calculateCommission( profit, commission );
                return Number(( profit - commissionAmount ).toFixed(2));
            }
            return -Number(stake.toFixed(2));
    }
};

export {
    calculateLiability,
    calculateResult,
    calculateCommission
};