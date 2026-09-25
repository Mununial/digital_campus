const studentService = require('../services/studentService');
const db = require('../config/db');

const records = [
  {
    "Student Name": "Debadatta Hembram",
    "D.O.B": "4/12/2002",
    "Registration No.": "2521316211",
    "Email Id": "debuhembram17@gmail.com",
    "Course": "Btech",
    "stream": "Civil",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1R2XR43M-OW1pbrD4UoSCZjGQu6V_7T31",
    "ROOM NO": "130"
  },
  {
    "Student Name": "Partha Sarathi Das",
    "D.O.B": "5/27/2006",
    "Registration No.": "2401316027",
    "Email Id": "dasparthasarathi2006@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1GwNAH5VhgsE7AFyTHRwzT8oVp1g1bhyH",
    "ROOM NO": "129"
  },
  {
    "Student Name": "Akash Nath",
    "D.O.B": "1/4/2007",
    "Registration No.": "2401316006",
    "Email Id": "akashnatha93@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1bud1tJozxozpZH5_ZZMFBoNuJ-YBBbcM",
    "ROOM NO": "128"
  },
  {
    "Student Name": "Rachana Mandal",
    "D.O.B": "7/15/2005",
    "Registration No.": "2401316125",
    "Email Id": "rachanamandal9225@gmail.com",
    "Course": "Btech",
    "stream": "Agriculture",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "2nd Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1ngeBHLT2z3Fe9Uo_MlNIW0Rs4u2uU9iV",
    "ROOM NO": "135"
  },
  {
    "Student Name": "Mita Raita",
    "D.O.B": "6/27/2006",
    "Registration No.": "2401316119",
    "Email Id": "mitaraita26@gmail.com",
    "Course": "Btech",
    "stream": "Agriculture",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1LZ8AEHYa8B_X7SbBMOQtr8NGotU0dKg_",
    "ROOM NO": "138"
  },
  {
    "Student Name": "Biuti Mallick",
    "D.O.B": "2/25/2007",
    "Registration No.": "2401316107",
    "Email Id": "molickbeauti@gmail.com",
    "Course": "Btech",
    "stream": "Agriculture",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1JeLlgbaSMJEscZzdOUq0e4-Z0W7CKiy3",
    "ROOM NO": "138"
  },
  {
    "Student Name": "Sania pradhan",
    "D.O.B": "4/10/2006",
    "Registration No.": "2401316131",
    "Email Id": "saniapradhan034@gmail.com",
    "Course": "Btech",
    "stream": "Agriculture",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1TMu5akOLLh_OOcuYaWMhDZu3KKG9llOE",
    "ROOM NO": "138"
  },
  {
    "Student Name": "Jyotsnarani Ho",
    "D.O.B": "6/29/2006",
    "Registration No.": "2521316218",
    "Email Id": "Jyotsnaraniho30@gmail.com",
    "Course": "Btech",
    "stream": "Civil",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1frdKqJT3M6JC7dZXuKnqaaiU16CxeEv3",
    "ROOM NO": "135"
  },
  {
    "Student Name": "Swapnarani nayak",
    "D.O.B": "11/6/2006",
    "Registration No.": "2401316043",
    "Email Id": "swapnaraninayak742@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1rgjHf6qOZ85BqrpoRyLO9hhdKQ1mCtn-",
    "ROOM NO": "135"
  },
  {
    "Student Name": "K Smrutimayee patra",
    "D.O.B": "12/22/2006",
    "Registration No.": "2401316081",
    "Email Id": "smrutimayeepatra147@gmail.com",
    "Course": "Btech",
    "stream": "Cse& Ds",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1IYx5B89bUhcIwBcoQpEXvZ1HB8F0e_vr",
    "ROOM NO": "138"
  },
  {
    "Student Name": "Laxmi Debnath",
    "D.O.B": "11/5/2006",
    "Registration No.": "2401316115",
    "Email Id": "debnathtaniya386@gmail.com",
    "Course": "Btech",
    "stream": "Agriculture",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=12GCAHJj0v9dgGNXBA3_2sStI2kIXS23I",
    "ROOM NO": "133"
  },
  {
    "Student Name": "Subhashree Das",
    "D.O.B": "8/3/2006",
    "Registration No.": "2401316040",
    "Email Id": "subhasheedas9@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Girls Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1V-D-lD6BTqKlLyLemg3CMh9aUolvRqXi",
    "ROOM NO": "137"
  },
  {
    "Student Name": "SWATI SWAGAT NAYAK",
    "D.O.B": "6/13/2007",
    "Registration No.": "2401316044",
    "Email Id": "kanhunayak1306@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=16srZYbJ-O66HdVgc7LfxPxLVrFTZjBpW",
    "ROOM NO": "102"
  },
  {
    "Student Name": "K.Arun Patra",
    "D.O.B": "9/2/2006",
    "Registration No.": "2301316097",
    "Email Id": "patraarun135@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "4th",
    "Semister": "7th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "2nd Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1sJg5U5QKTJJSjajCbd-gMrIU7tHb-6m2",
    "ROOM NO": "103"
  },
  {
    "Student Name": "Soubhagya Nayak",
    "D.O.B": "5/25/2007",
    "Registration No.": "2401316062",
    "Email Id": "soubhagyanayakone@gmail.com",
    "Course": "Btech",
    "stream": "aeronautical",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1HBH72YVYSVOQwj9t_NhPknRsoqePAcWu",
    "ROOM NO": "127"
  },
  {
    "Student Name": "Abinash Nayak",
    "D.O.B": "8/25/2006",
    "Registration No.": "2401316065",
    "Email Id": "nabhinash57@gmail.com",
    "Course": "Btech",
    "stream": "EE & ECE",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1JxIZfDe3AqCWjui7KhYsTjXBs2BWpYDH",
    "ROOM NO": "104"
  },
  {
    "Student Name": "Bibhu prasad jena",
    "D.O.B": "7/30/2006",
    "Registration No.": "2401316076",
    "Email Id": "jenabibhuprasad834@gmail.com",
    "Course": "Btech",
    "stream": "Cse& Ds",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1sNMukXIRnAsdUIkJEifWEqwTIIdcVGx_",
    "ROOM NO": "127"
  },
  {
    "Student Name": "Bishwa Prakash Nayak",
    "D.O.B": "3/28/2007",
    "Registration No.": "2401316057",
    "Email Id": "armanbishwa20@gmail.com",
    "Course": "Btech",
    "stream": "aeronautical",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1GLggR3ZZAsJyAvuR4VB3yhGD9ZH1WB5z",
    "ROOM NO": "127"
  },
  {
    "Student Name": "Sudhansu Sekhar Brahma",
    "D.O.B": "8/27/2007",
    "Registration No.": "2501316190",
    "Email Id": "sudhansubrahma80@gmail.com",
    "Course": "Btech",
    "stream": "Civil",
    "Year": "2nd",
    "Semister": "3rd",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1nA-j-VGnOHjWtwfuec7HRXQZyEhkhrwF",
    "ROOM NO": "104"
  },
  {
    "Student Name": "Rashmi Ranjan Das",
    "D.O.B": "9/25/2006",
    "Registration No.": "2401316030",
    "Email Id": "kanha4594@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1DgT4mlCL77y24iDDpVg0lYnJX6nNgPyC",
    "ROOM NO": "128"
  },
  {
    "Student Name": "AYUSHMAN BEHERA",
    "D.O.B": "4/11/2006",
    "Registration No.": "2401316010",
    "Email Id": "beheraayushman36@gmail.com",
    "Course": "Btech",
    "stream": "Cse",
    "Year": "3rd",
    "Semister": "5th",
    "Hostel Choose": "Baramunda Boys Hostel",
    "Floor Choose": "1St Floor",
    "Passport Size Photo": "https://drive.google.com/open?id=1-eAAX4Mqtf0e2DNuopkc4tArq0-d1xuq",
    "ROOM NO": "128"
  }
];

async function runImport() {
  console.log(` Starting import of ${records.length} new student records...`);
  try {
    const summary = await studentService.bulkImportStudents(records);
    console.log('\n IMPORT BATCH COMPLETED!');
    console.log(` Total Processed: ${summary.totalProcessed}`);
    console.log(` Successfully Imported: ${summary.successCount}`);
    console.log(` Skipped / Errors: ${summary.skippedCount}`);
    if (summary.errors.length > 0) {
      console.log('\n Skipped Details:', summary.errors);
    }
    process.exit(0);
  } catch (err) {
    console.error(' Import failed:', err);
    process.exit(1);
  }
}

runImport();
