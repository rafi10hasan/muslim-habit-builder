import moment from 'moment-timezone';

export const buildDateBasedOnTimeZone = (
    date: string | Date,
    timezone: string
): Date => {
    const dateString = moment(date).tz(timezone).format('YYYY-MM-DD');
    return moment
        .tz(`${dateString}`, 'YYYY-MM-DD', timezone)
        .utc()
        .toDate();
};