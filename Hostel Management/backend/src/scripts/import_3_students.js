const studentService = require('../services/studentService');

const records = [
  {
    "Student Name": "Rahul Jamana",
    "D.O.B": "9/15/2006",
    "Registration No.": "2301316047",
    "Email Id": "rahuljamana5@gmail.com",
    "Course": "Btech",
    "stream": "Cse& Ds",
    "Year": "4th",
    "Semister": "7th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=13cufyKvHwF3EMnP61mLhr6ajQqv9KqeY",
    "ROOM NO": "120"
  },
  {
    "Student Name": "Siba sundar mohanty",
    "D.O.B": "9/28/2005",
    "Registration No.": "2301316120",
    "Email Id": "shiba143347@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "4th",
    "Semister": "7th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1UO0T3iHe_847PS0FFyE60CZqtz_NHOFG",
    "ROOM NO": "123"
  },
  {
    "Student Name": "jitendra nial",
    "D.O.B": "5/12/2005",
    "Registration No.": "2301316095",
    "Email Id": "Mununial637@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "4th",
    "Semister": "7th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1VIemrEbnx2lA6TZeACvGF4PNp8dLfzp0",
    "ROOM NO": "118"
  }
];

async function runImport() {
  console.log(` Starting import of ${records.length} new student records...`);
  try {
    const summary = await studentService.bulkImportStudents(records);
    console.log('\n IMPORT COMPLETED!');
    console.log(` Total Processed: ${summary.totalProcessed}`);
    console.log(` Successfully Imported: ${summary.successCount}`);
    console.log(` Skipped / Errors: ${summary.skippedCount}`);
    if (summary.errors && summary.errors.length > 0) {
      console.log('\n Skipped Details:', summary.errors);
    }
    process.exit(0);
  } catch (err) {
    console.error(' Import failed:', err);
    process.exit(1);
  }
}

runImport();
