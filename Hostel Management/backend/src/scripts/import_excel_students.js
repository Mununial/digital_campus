const path = require('path');
const XLSX = require(path.join(__dirname, '../../../frontend/node_modules/xlsx'));
const studentService = require('../services/studentService');

async function runExcelImport() {
  console.log(' Starting Mass Student Import from Excel file...');
  const filePath = path.join(__dirname, '../../../frontend/src/assets/Hostel Students Room Details Form.xlsx');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(` Found Sheet "${sheetName}" with ${records.length} records.`);

    const adminCreator = { id: 1, role: 'SUPER_ADMIN' };
    const result = await studentService.bulkImportStudents(records, adminCreator);

    console.log('\n IMPORT COMPLETED SUCCESSFULLY!');
    console.log(`• Total Rows Processed: ${result.total}`);
    console.log(`• Successfully Imported: ${result.importedCount}`);
    console.log(`• Skipped / Errors: ${result.skippedCount}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n Skipped Rows / Notice Details:');
      result.errors.forEach(err => {
        console.log(`  Row ${err.row} (${err.name} - ${err.regNo}): ${err.reason}`);
      });
    }

  } catch (err) {
    console.error(' Import Script Error:', err);
  } finally {
    process.exit(0);
  }
}

runExcelImport();
