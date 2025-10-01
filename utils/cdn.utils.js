const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");
const fs = require("fs");
const path = require("path");
const { date } = require("zod");

const generateCloudFrontPolicy = (userId, courseId, expiryDate) => {
   return {
      Statement: [
         {
            Resource: `${process.env.CLOUDFRONT_DOMAIN}/private/${userId}/${courseId}/*`,
            Condition: {
               DateLessThan: {
                  "AWS:EpochTime": Math.floor(expiryDate.getTime() / 1000),
               },
            },
         },
      ],
   };
};

const refreshCookies = (req, userId, courseId, expiryDate) => {
   const policyKey = `CloudFront-Policy-${userId}-${courseId}`;
   const signatureKey = `CloudFront-Signature-${userId}-${courseId}`;
   const keyPairIdKey = `CloudFront-Key-Pair-Id-${userId}-${courseId}`;

   const policyCookie = req.cookies[policyKey];
   const signatureCookie = req.cookies[signatureKey];
   const keyPairIdCookie = req.cookies[keyPairIdKey];

   if (!policyCookie || !signatureCookie || !keyPairIdCookie) {
      return true;
   }

   const oneHourLater = Math.floor(Date.now() / 1000 + 3600);
   const cookieExpiry = Math.floor(expiryDate.getTime() / 1000);
   if (oneHourLater > cookieExpiry) {
      return true;
   }
};

const setCloudfrontCookies = (res, userId, courseId, expiryDate) => {
   console.log(userId);
   const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n");
   const policy = generateCloudFrontPolicy(userId, courseId, expiryDate);
   const signedCookies = getSignedCookies({
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: privateKey,
      policy: JSON.stringify(policy),
   });

   Object.keys(signedCookies).forEach((key) => {
      res.cookie(`${key}-${userId}-${courseId}`, signedCookies[key], {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: "lax",
         // domain: new URL(process.env.CLOUDFRONT_DOMAIN).hostname, // 👈 important
         path: "/",
         expires: new Date(
            policy.Statement[0].Condition.DateLessThan["AWS:EpochTime"] * 1000
         ),
      });
   });
   return signedCookies;
};

module.exports = { setCloudfrontCookies, refreshCookies };
