# 🏢 Enterprise ERP Mobile App (React Native + Expo SDK 58 & Node.js + MongoDB)

একটি সম্পূর্ণ প্রফেশনাল, আধুনিক এবং অ্যাডভান্স ফিচার সমৃদ্ধ **ERP (Enterprise Resource Planning) Mobile Application**। এটি ফ্রন্টএন্ডে **Expo (React Native)** এবং ব্যাকএন্ডে **Node.js, Express এবং MongoDB Atlas** ব্যবহার করে তৈরি করা হয়েছে।

---

## 🌟 সিস্টেম ফিচার ও মডিউলসমূহ (Core Modules)

1. **Dashboard (ড্যাশবোর্ড)**:
   - লাইভ KPI মেট্রিক্স (Total Revenue, Orders, Purchases, Low Stock Alerts)
   - কুইক অ্যাকশন বাটন (New Sale, Add Product, New PO, Attendance)
   - মাসিক সেলস ট্রেন্ড এবং সাম্প্রতিক সেলস অর্ডারের রিয়েল-টাইম লিস্ট।
   
2. **Inventory Management (ইনভেন্টরি ও স্টক)**:
   - পণ্যের বিস্তারিত তালিকা, ক্যাটাগরি, SKU, কস্ট প্রাইস ও সেলিং প্রাইস।
   - অটোমেটিক লো-স্টক ওয়ার্নিং সিস্টেম (কালার কোডেড ব্যাজ)।
   - নতুন প্রডাক্ট যুক্ত করা, এডিট করা ও স্টক আপডেট করার ফুল মডাল ফর্ম।

3. **Sales & Billing (বিক্রয় ও চালান)**:
   - কাস্টমার সার্চ ও নির্বাচন, পণ্য যোগ এবং অটো-ক্যালকুলেশন।
   - **SSLCommerz Payment Gateway** ইন্টিগ্রেশন (অনলাইন পেমেন্ট)।
   - ক্যাশ এবং ব্যাংক পেমেন্ট সাপোর্ট।
   - বিভিন্ন ফিল্টার (Pending, Confirmed, Shipped, Delivered)।

4. **Purchase & Restocking (ক্রয় ও সাপ্লায়ার)**:
   - সাপ্লায়ারদের থেকে পারচেজ অর্ডার (PO) তৈরি।
   - **Receive Goods ফাংশনালিটি**: পণ্য রিসিভ করলে স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে স্টক বেড়ে যায়!

5. **HR & Payroll (মানবসম্পদ ও বেতন)**:
   - **Employees**: কর্মকর্তা-কর্মচারীদের প্রোফাইল ও বেতন কাঠামো।
   - **Attendance**: ডেইলি চেক-ইন এবং চেক-আউট ট্র্যাকিং।
   - **Leaves**: ছুটির আবেদন ও অ্যাডমিন অনুমোদন/বাতিল ব্যবস্থা।
   - **Payroll**: মাসিক বেতন শিট তৈরি ও বেতন পরিশোধের পর অটো-অ্যাকাউন্টিং এন্ট্রি।

6. **Accounts & Finance (হিসাব ও সাধারণ খতিয়ান)**:
   - আয় (Income), ব্যয় (Expense) এবং নিট প্রফিট (Net Balance) ড্যাশবোর্ড।
   - ইনকাম/এক্সপেন্স ভাউচার পোস্টিং।

7. **Security & Authentication**:
   - JWT টোকেন ভিত্তিক অথেন্টিকেশন ও সিকিউর স্টোরেজ।
   - Gmail Nodemailer ইন্টিগ্রেশন (ওয়েলকাম ও পাসওয়ার্ড রিসেট ইমেইল)।

---

## 🔑 কনফিগারেশন ও ক্রেডেনশিয়ালস (Credentials)

```env
MONGODB_URI=mongodb+srv://rubel:rubel2468@cluster0.m7n3ky6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
EMAIL_SERVICE=gmail
EMAIL_USER=rk1769950@gmail.com
EMAIL_PASS=wzri flwl xxka fubk
STORE_ID=wczep68e90d5632880
STORE_PASSWORD=wczep68e90d5632880@ssl
PORT=5000
JWT_SECRET=erp_secret_jwt_key_2024
```

---

## 🚀 যেভাবে চালাবেন (How to Run)

### ধাপ ১: ব্যাকএন্ড সার্ভার চালু করা (Backend Setup)

নতুন একটি টার্মিনালে যান:
```bash
cd backend
npm install
```

**ডাটাবেজে প্রাথমিক টেস্ট ডাটা যুক্ত করা (Seeding Initial Data):**
```bash
node seed.js
```
*(এটি স্বয়ংক্রিয়ভাবে অ্যাডমিন ইউজার, স্যাম্পল ক্যাটাগরি, প্রোডাক্টস ও ট্রানজ্যাকশন ডাটাবেজে তৈরি করে দিবে)*

**ব্যাকএন্ড সার্ভার স্টার্ট করুন:**
```bash
npm start
# অথবা ডেভেলপমেন্ট মোডে:
npm run dev
```
সার্ভার `http://localhost:5000` এ রানিং হবে।

---

### ধাপ ২: এক্সপো মোবাইল অ্যাপ চালু করা (Frontend Setup)

অন্য একটি টার্মিনালে যান:
```bash
# In project root
npm install
```

**মোবাইল অ্যাপ রান করুন:**
```bash
npx expo start
```
- **Android এ দেখতে**: টার্মিনালে `a` চাপুন (Android Emulator) অথবা ফোনে Expo Go অ্যাপ দিয়ে QR কোড স্ক্যান করুন।
- **Web ব্রাউজারে দেখতে**: টার্মিনালে `w` চাপুন (লোকাল ওয়েব ব্রাউজারে অ্যাপ ওপেন হবে)।
- **iOS এ দেখতে**: টার্মিনালে `i` চাপুন (macOS প্রয়োজন)।

---

## 👤 ডিফল্ট লগইন একাউন্ট (Default Admin Login)

- **Email**: `rk1769950@gmail.com` (অথবা `admin@erp.com`)
- **Password**: `admin123`
