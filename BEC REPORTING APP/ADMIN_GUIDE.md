# Administrator & Staff Guide

Welcome to the BEC SRMS Admin Dashboard. This guide explains how to manage student records effectively.

## Accessing the Dashboard
Only accounts with the `admin` or `staff` role can access the dashboard.
To grant admin privileges:
1. The user must first register an account on the application.
2. A super-admin must open the Firebase Console -> Firestore -> `students` collection.
3. Locate the user's document and manually change the `role` field from `"student"` to `"admin"`.

## Dashboard Features

### 1. The Student Table
The table displays all registered students. To prevent the browser from crashing, data is paginated (10 records per page). Use the **Previous** and **Next** buttons at the bottom to navigate.

### 2. Searching
You can search for a student by their **Full Name**.
- Type at least 3 characters into the search bar.
- The system will pause for half a second (to prevent spamming the database) and then fetch matches.
- *Note: Pagination is disabled while viewing search results.*

### 3. Editing a Student Record
Click the **Edit** button next to a student to open the modal. Here you can:
- Assign a **Registration Number**, **Enrollment Number**, or **Roll Number**.
- Assign a **Section**.
- Update their **Blood Group** (if they forgot to provide it).
- Add internal **Remarks**.
- Check the **Verified** box once their physical documents have been checked.

### 4. Generating ID Cards
Click the green **ID Card** button to generate a printable PDF for the student.
- **Prerequisites:** The student *must* have an assigned Registration Number, Blood Group, Course, Branch, and an uploaded Photo. If any are missing, the system will block the generation and tell you what is missing.
- **Tip:** You can assign the Registration Number using the Edit button right before generating the ID card.

### 5. Exporting to Excel
Click the **Export to Excel** button to download a `.xlsx` spreadsheet of the students currently visible in the table. 

### 6. Audit Logging
Every action you take (Logging in, Editing a Record, Generating an ID card) is permanently logged in the database for security and accountability purposes.
