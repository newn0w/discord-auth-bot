import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const email: string = process.env.SERVICE_ACCOUNT_EMAIL!;
const key: string = process.env.SERVICE_ACCOUNT_KEY!;


export const loadSpreadsheet = async (sheetID: string) => {

  const serviceAccountAuth = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const doc = new GoogleSpreadsheet(sheetID, serviceAccountAuth);

  await doc.loadInfo();
  return doc;
}
