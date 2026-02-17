// // import {
// //   Html,
// //   Head,
// //   Font,
// //   Preview,
// //   Heading,
// //   Row,
// //   Section,
// //   Text,
// //   Button,
// // } from '@react-email/components';


// export default function VerificationEmail({ username, otp }) {
//   return (
    
// <html>
// <head>
//   <meta charset="UTF-8">
//   <meta http-equiv="X-UA-Compatible" content="IE=edge">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Email Verification</title>
//   <style>
//     body {
//       font-family: Arial, sans-serif;
//       background-color: #f4f4f4;
//       margin: 0;
//       padding: 0;
//       color: #333;
//     }
//     .container {
//       width: 100%;
//       max-width: 600px;
//       margin: 0 auto;
//       background-color: #ffffff;
//       border-radius: 8px;
//       box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//       padding: 20px;
//     }
//     .header {
//       background-color: #4CAF50;
//       padding: 10px 0;
//       text-align: center;
//       color: white;
//       border-top-left-radius: 8px;
//       border-top-right-radius: 8px;
//     }
//     .content {
//       padding: 20px;
//       text-align: center;
//     }
//     .otp {
//       font-size: 24px;
//       font-weight: bold;
//       margin: 20px 0;
//       color: #4CAF50;
//     }
//     .footer {
//       margin-top: 20px;
//       text-align: center;
//       font-size: 14px;
//       color: #999999;
//     }
//     .btn {
//       background-color: #4CAF50;
//       color: white;
//       padding: 10px 20px;
//       text-decoration: none;
//       border-radius: 5px;
//       font-size: 18px;
//       display: inline-block;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//       <h2>Email Verification</h2>
//     </div>
//     <div class="content">
//       <p>Hello,</p>
//       <p>Thank you for registering with us! Please use the following OTP to verify your email address:</p>
//       <div class="otp">{{otp}}</div>
//       <p>If you didn’t request this email, you can ignore this message.</p>
//       <a href="{{verification_url}}" class="btn">Verify Email</a>
//     </div>
//     <div class="footer">
//       <p>If you have any issues, please contact support.</p>
//       <p>&copy; 2025 Your Company Name. All rights reserved.</p>
//     </div>
//   </div>
// </body>
// </html>

//   );
// }
