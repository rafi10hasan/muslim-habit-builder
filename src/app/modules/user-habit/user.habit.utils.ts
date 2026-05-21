import moment from 'moment-timezone';

export const buildDateBasedOnTimeZone = (
    timezone: string
): string => {
    return moment.tz(timezone).format('YYYY-MM-DD');
};