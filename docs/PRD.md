# SOUNDOCK - Product Requirements Document

## 1. Project Overview

### Service Description

SOUNDOCK is a platform where users can share their creative works (YouTube links) and music playlists (Spotify or SoundCloud integration) through posts, and support creators using in-platform currency. Payments are processed through Toss Payments.

**Regular Members**
- Create posts
- Support creators
- Charge platform currency
- Register promotional posts
- Register playlists (Spotify/SoundCloud integration)
- Withdraw accumulated currency

**Administrators**
- Manage user status
- Manage settlements
- Create announcements
- Manage posts/comments
- Process reports
- Penalize users

### Platform Information

- **Platform Name**: SOUNDOCK
- **Platform Currency**: POP

### Logo Design Concept
- Reference: https://logopond.com/SergiumDesign/showcase/detail/317898

### POP Currency Icon Concept
- Reference: https://www.flaticon.com/kr/free-animated-icon/what_10246749
- Popping effect on mouse hover
- "POP" text inside icon
- Text enlarges and moves outside icon on hover
- Text color: Yellow
- Icon border color: Sky blue
- Action icon

---

## 2. Goals

- Ensure user convenience
- Icon-button-centric clean UI design
- Clean and modern white-tone aesthetic

---

## 3. Tech Stack

- **Framework**: Next.js 16 (App Router) + React
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: CSS Modules, lucide-react
- **API Communication**: Axois API
- **Authentication**: JWT (HttpOnly Cookie)

---

## 4. API Routes Mapping

> Backend APIs are already defined. The frontend must integrate with the following endpoints.

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/email` - Email duplicate check
- `POST /api/auth/verification` - Email verification token send/confirm
- `POST /api/auth/refresh` - Access token refresh
- `PATCH /api/auth/findpassword` - Password recovery (change)

### Boards & Posts

- `GET /api/boards` - Main board page (Top 5-6 Spotlight posts in card format)
- `GET /api/boards/{category}` - Get posts by category
- `POST /api/boards/{category}` - Create new post
- `GET /api/boards/{category}/{boardId}` - Get post details
- `PATCH /api/boards/{category}/{boardId}` - Edit post
- `DELETE /api/boards/{category}/{boardId}` - Delete post
- `POST /api/boards/{category}/{boardId}/pin` - Register promotional post (currency required)
- `POST /api/boards/{category}/{boardId}/like` - Like/unlike post
- `POST /api/boards/{category}/{boardId}/report` - Report post

### Comments & Replies

- `POST /api/boards/{category}/{boardId}/comments` - Create comment
- `PATCH /api/boards/{category}/{boardId}/comments/{commentId}` - Edit comment
- `DELETE /api/boards/{category}/{boardId}/comments/{commentId}` - Delete comment
- `POST /api/boards/{category}/{boardId}/comments/{commentId}/like` - Like/unlike comment
- `POST /api/boards/{category}/{boardId}/comments/{commentId}/report` - Report comment
- `POST /api/boards/{category}/{boardId}/comments/{commentId}/{replyId}` - Create reply
- `DELETE /api/boards/{category}/{boardId}/comments/{commentId}/{replyId}` - Delete reply
- `POST /api/boards/{category}/{boardId}/comments/{commentId}/{replyId}/report` - Report reply

### My Page

- `GET /api/mypage/playlist/{userId}` - Get playlist
- `GET /api/mypage` - My page main
- `POST /api/mypage/playlist` - Register playlist
- `DELETE /api/mypage/playlist` - Delete playlist
- `GET /api/boards/{userId}` - Get user's posts
- `GET /api/comments/{userId}` - Get user's comments
- `GET /api/mypage/like-boards` - Get liked posts
- `GET /mypage/credit/history/buy` - Payment history
- `GET /api/mypage/support/sent` - Credit usage history
- `GET /api/mypage/settlement` - Settlement history
- `GET /api/mypage/reports` - Get reports
- `DELETE /api/mypage/reports` - Delete reports
- `POST /api/mypage/updatepassword` - Update password
- `PATCH /api/mypage/updateprofile` - Update profile
- `GET /api/mypage/messages` - Get received messages
- `GET /api/mypage/messages/{messageId}` - Get message details
- `POST /api/mypage/message/send/{userId}` - Send message
- `DELETE /api/mypage/messages/{messageId}` - Delete message

### Weather

- `GET /api/weather/info?Region={REGION_ENUM}` - Get current humidity + instrument care guidance by selected region (login not required)

### Currency & Donations

- `POST /api/mypage/credit/charge/request` - Request credit purchase
- `POST /api/mypage/credit/charge/confirm` - Credit purchase callback
- `POST /api/mypage/credit/charge/cancel/request` - Request purchase cancellation
- `POST /api/mypage/credit/charge/cancel/confirm` - Purchase cancellation callback
- `POST /api/users/{userId}/donations` - Donate to user
- `DELETE /api/users/{userId}/donations/{donationId}` - Cancel donation
- `GET /api/mypage/balance` - Get credit balance (charged/used/remaining)
- `POST /api/mypage/balance/cancel` - Cancel credit usage

### Settlements

- `POST /api/mypage/settlements` - Register settlement info
- `GET /api/mypage/settlements/available` - Get settlement history
- `POST /api/mypage/settlements/request` - Request settlement
- `POST /api/mypage/settlements/verification` - Verify settlement account
- `POST /api/mypage/settlements/cancel/request` - Cancel settlement request

### Admin

- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/{userId}` - Manage user grade/role/status
- `GET /api/admin/boards` - Get all posts
- `DELETE /api/admin/boards/{boardId}` - Delete post
- `GET /api/admin/comments` - Get all comments
- `DELETE /api/admin/comments/{commentId}` - Delete comment
- `GET /api/admin/inquiries` - Get inquiries
- `GET /api/admin/inquiries/{inquiryId}` - Get inquiry details
- `POST /api/admin/inquiries/{inquiryId}` - Complete inquiry
- `GET /api/admin/reports` - Get all reports
- `GET /api/admin/reports/{reportId}` - Get report details
- `POST /api/admin/reports/penalties/{userId}` - Penalize user
- `GET /api/admin/reports/penalties` - Get penalized users
- `GET /api/admin/reports/penalties/{userId}` - Get penalty details
- `GET /api/admin/settlements` - Get settlement requests
- `GET /api/admin/settlements/{boardId}` - Get settlement details
- `POST /api/admin/settlements/{boardId}` - Approve settlement

---

## 5. Core Features

### Authentication

- JWT-based login/logout (HttpOnly Cookie)
- **Registration Flow**:
  1. Enter email (ID), password + confirmation, nickname, phone number
  2. Send verification code via email
  3. Verify code
  4. Complete registration → Navigate to login page

---

## 6. Screen Specifications

### Common Layout

#### Header (Main Page / Boards / My Page)

**Left**: Site logo

**Center**: Board category menu (Showcase, Playlists, Spotlight, Community, Reviews)

**Right (Logged In)**:
- Weather guide button (droplets icon) → Open "내 악기 관리 가이드" modal → Select one of 10 cities to fetch current humidity + show care message (login not required)
- Dark mode button (crescent moon icon) → Toggle dark mode for entire page
- Message box button (envelope icon) → Open message modal
- My page icon (person icon) → Navigate to my page
- Logout icon (exit door icon) → Show "Logged out" toast → Logout → Navigate to main

**Right (Not Logged In)**:
- Weather guide button (droplets icon) → Open "내 악기 관리 가이드" modal → Select one of 10 cities to fetch current humidity + show care message (login not required)
- Dark mode button (crescent moon icon) → Toggle dark mode for entire page
- Login button (enter door icon) → Navigate to login page

#### Header (Signup/Login Pages)

**Center Top**: Site logo only

#### Footer

Applied to all pages (main, boards, login, signup, etc.)

---

### Main Page

Header and footer fixed, only body re-renders.

**Body Structure (Top to Bottom)**:

1. **Spotlight Carousel**
   - Auto-slide 10 cards of Spotlight posts (right direction)
   - After 10th card, returns to 1st card
   - Shows post's image/title/brief description
   - 5 visible cards, center card enlarged during slide
   - Click center card → Navigate to post
   - Click non-center card → Slide to center
   - Reference: https://www.bluesquare.kr/ "WHAT'S ON" section

2. **TOP Showcase**
   - Top 8 Showcase posts by likes
   - 4 cards per row, 2 rows
   - Shows YouTube thumbnail, author nickname, title, like count
   - Hover → Enlarge thumbnail → Auto-play muted video after 1 sec
   - Hover out → Return to original size
   - Click → Navigate to post detail
   - Reference: https://www.sooplive.co.kr/ "Popular LIVE" section

3. **TOP Playlists**
   - Top 8 Playlists posts by likes
   - 4 cards per row, 2 rows
   - Shows playlist thumbnail, author nickname, title, like count
   - Hover → Enlarge thumbnail
   - Hover out → Return to original size
   - Click → Navigate to post detail
   - Reference: https://www.sooplive.co.kr/ "Popular LIVE" section

---

### Signup Page (`/auth/signup`)

**Layout**: Auth header + Body + Footer

**Body Elements**:
- Email input (placeholder: example@gmail.com)
- Password input (placeholder: Include uppercase, number, special char / 10+ chars) (Show/hide toggle)
- Password confirmation (placeholder: Confirm password) (Show/hide toggle)
- Nickname input (placeholder: No special chars / Max 10 chars)
- Nickname duplicate check button
- Phone number input (auto-format: 010-1234-5678, numbers only)
- Signup button

**Validation**:
- Real-time email duplicate check (500ms debounce)
- Real-time password validation (show missing conditions below input)
- Nickname required validation
- Phone number format validation
- Error messages displayed below inputs

**Completion**: Click signup → Send verification email → Navigate to `/auth/verification`

**Reference**: https://member.sooplive.co.kr/app/join.php

---

### Email Verification (`/auth/verification`)

**Layout**: Auth header + Body + Footer

**Body Content**:
- Text: "Almost there! A verification email has been sent to example@gmail.com. Please click the email verification button within 5 minutes, then click the Complete Registration button below."
- Complete Registration button
- "Didn't receive email? Resend" link
- Click Complete Registration → Modal → Confirm → Navigate to `/auth/login`

---

### Login (`/auth/login`)

**Layout**: Auth header + Body + Footer

**Body Elements**:
- Email input (placeholder: example@gmail.com)
- Password input (placeholder: Enter password) (Show/hide toggle)
- Login button
- Signup link (`/auth/signup`)
- Find password link (`/auth/password`)

**Validation**:
- Empty email/password → Show error below input
- Invalid credentials → Toast: "Email or password incorrect"
- Deleted account → Toast: "Deleted account"
- BANNED status → Toast: "No login permission"
- BLOCKED status → Toast: "Access restricted until YY.mm.dd"

**Loading**: Show spinner during login, blur background, disable inputs

**Reference**: https://login.sooplive.co.kr/afreeca/login.php

---

### Find Password (`/auth/findpassword`)

**Layout**: Auth header + Body + Footer

**Body Elements**:
- Email input
- Send password reset email button
- Confirmation text with user's email
- New password input (validation rules) (Show/hide toggle)
- Confirm new password (Show/hide toggle)
- Change password button
- Resend email link

---

### Update Password (`/mypage/updatepassword`)

**Layout**: User header + Body + Footer

**Body Elements**:
- New password input (validation rules) (Show/hide toggle)
- Confirm new password (Show/hide toggle)
- Submit button
- Success modal → Navigate to login

---

### Update Profile (`/mypage/updateprofile`)

**Layout**: User header + Body + Footer

**Body Elements**:
- Nickname input (duplicate check)
- Phone number input (auto-format)
- Update button → Toast "Successfully updated" → Navigate to `/mypage`
- Withdraw account button (bottom right) → Navigate to `/mypage/withdraw`

---

### Account Withdrawal (`/withdraw`)

**Layout**: User header + Body + Footer

**Body Content**:
- Terms and conditions text
- Checkbox: "I have read all above"
- Withdraw button (disabled until checkbox checked)
- Confirm modal → Logout + Withdraw → Navigate to home

---

### My Page

**Layout**: Board header + Profile section + Tab section + Content section + Footer

**Profile Section**:
- Profile photo (left, circular, editable on hover)
- Nickname (large, bold, right of photo)
- Email (below nickname)
- Phone number (below email)
- Current credits (below phone)
- Total likes received (right of nickname)

**Action Icons** (top right):
- Credit icon (POP themed)
- Update password icon
- Update profile icon

**Tabs** (content section re-renders only):

1. **Playlists**
   - Register playlist button (top right)
   - Show user's playlists

2. **My Posts**
   - Search bar (top)
   - Columns: Board/Title/Date/Views/Likes

3. **My Comments**
   - Search bar (top)
   - Columns: Content/Date/Original post/Board

4. **Liked Posts**
   - Sort by like date (descending)
   - Columns: Board/Title/Author/Date/Views/Likes

5. **Payment History**
   - Date range filter
   - Columns: Charge date/Amount/Remaining/Payment method/Price/Expiry/Cancel button
   - Empty state: "No payment history"
   - Date format: yyyy.mm.dd hh:mm:ss

6. **Credit Usage History**
   - Date range filter
   - Filter: Donation/Advertisement

7. **Settlement History**
   - Date range filter
   - Columns: Settlement date/Request date/Amount/Status
   - Status: Pending/Approved/Rejected/Completed

8. **Report History**
   - Date range filter
   - Columns: Report date/Reason/Status/Link/Cancel
   - Bulk delete with checkboxes
   - Confirmation modal for cancellation

**Reference**: https://grounz.net/profile/14930322?pager=1&profileTab=

---

### Board Lists (Showcase / Playlists / Spotlight)

**Body Structure**:

1. **Carousel** (top)
   - Top 10 posts by monthly likes
   - 5 visible cards, center enlarged
   - Click center → Navigate to post
   - Click others → Slide to center
   - Reference: https://www.bluesquare.kr/ "WHAT'S ON"

2. **Search/Write Section**
   - Left: Search filter (Title/Nickname) + Input + Search button
   - Right: Write post button → Navigate to create page

3. **Post Grid**
   - Showcase: YouTube thumbnails, auto-play on hover
   - Playlists: Playlist thumbnails
   - 4 cards per row, 3 rows
   - Infinite scroll
   - Click → Navigate to post detail
   - Reference: https://www.sooplive.co.kr/directory/category/

---

### Board Lists (Community / Reviews)

**Body Structure**:

1. **Search/Write Section**
   - Left: Search filter + Input + Search button
   - Right: Write post button

2. **Post List**
   - List view (20 items)
   - Infinite scroll
   - Columns: Number/Title/Author/Likes/Views/Date
   - Click → Navigate to post detail

---

### Create Post - Showcase

**Input Fields**:

1. **Title**
   - Min 3, max 15 chars
   - Placeholder: "Enter title"
   - Validation error below input

2. **YouTube URL**
   - Placeholder: "https://"
   - Validation: Must start with https://www.youtube.com/
   - Helper text: "Share your video"

3. **Content**
   - Min 5, max 300 chars
   - Placeholder: "Enter content"

4. **Buttons**
   - Cancel → Go back
   - Submit → Create post → Navigate to board
   - Submit disabled until all validations pass

---

### Create Post - Playlists

**Input Fields**:

1. **Title** (same as Showcase)

2. **Add Playlist Button**
   - Opens modal with saved playlists
   - Radio select → Add
   - Shows thumbnail and title below button

3. **Content** (same as Showcase)

4. **Buttons** (same as Showcase)

---

### Create Post - Spotlight

**Input Fields**:

1. **Title** (same as Showcase)

2. **Add Photos Button**
   - Upload from PC
   - Min 1, max 5 photos
   - First photo shown in cards
   - Helper text: "First photo will be displayed (1-5 photos)"

3. **Content** (same as Showcase)

4. **Buttons** (same as Showcase)

---

### Create Post - Community / Reviews

**Input Fields**:

1. **Title** (same as Showcase)

2. **Attach Files Button**
   - Upload from PC (max 3 files)
   - Shows file list below button

3. **Content** (same as Showcase)

4. **Buttons** (same as Showcase)

---

### Post Detail - Showcase

**Structure**:

1. **Title Section**
   - Left: Post title
   - Right: Like button/count, View icon/count, Date
   - Far right: Menu (...) → Edit/Delete/Report dropdown
   - Author: Edit/Delete, Others: Report, Non-members: Disabled

2. **Author Section**
   - Left: Author nickname (click → View posts/Send message/Report)
   - Right: Donate button (POP icon) → Opens donation modal

3. **Content Section**
   - Embedded YouTube video
   - Post content text
   - Like button (heart icon) → Toggle like/unlike

4. **Comments Section**
   - Comment button (speech bubble icon) → Expand comments
   - Input: "Write a comment" (1-50 chars)
   - Submit button (write icon)
   - Comment format: Nickname, date, content
   - Menu (...) → Edit/Delete/Report
   - Reply button → Expand reply input
   - Reply count badge on reply button
   - Date format: YYYY-MM-DD hh:mm

---

### Post Detail - Playlists

Same as Showcase, except:
- **Content**: Playlist thumbnail/title/description
- Click thumbnail → Navigate to playlist URL

---

### Post Detail - Spotlight

Same as Showcase, except:
- **Content**: Uploaded photos + text content

---

### Post Detail - Community / Reviews

Same as Showcase, except:
- **Content**: Attached files list + download buttons + text content

---

## 7. API Integration Rules

All API responses follow this format:

```json
{
  "success": true,
  "message": null,
  "data": {}
}
```

---

## 8. UI/UX Requirements

### Design Concept

- **Overall Tone**: White-tone based, clean and modern
- **Color Theme**: Calm and clean (must differ from reference sites)
- **References**:
  - https://ticket.yes24.com
  - https://www.sooplive.co.kr

### Platform & Accessibility

- Platform: PC only
- No accessibility requirements

---

## 9. State Management Rules

### Global State (Redux)

- Logged-in user info
- Token status
- Unread message count

### Local State

- Modal open/close
- Dropdown status
- Input values

---

## 10. Error Handling

- Refresh token expired → Logout → Navigate home
- API failure → Toast message
- Request > 500ms → Show loading spinner
- Empty data → Toast: "No posts available"

---

## 11. Code Style

### ESLint + Prettier

- Airbnb style guide
- React Hooks rules mandatory
- No unused variables
- No console.log

**Prettier Config**:
- Semicolons: Yes
- Quotes: Single
- Tab width: 2 spaces
- Max line length: 100

**Build Rules**:
- Pre-commit hook applied
- Build fails on ESLint errors

---

## 12. Cursor AI Guidelines

### Required Technologies

- TypeScript mandatory
- Functional components only
- Minimal component structure + conditional rendering

### Folder Structure

```
src/
├── components/
│   ├── auth/
│   ├── board/
│   ├── home/
│   ├── admin/
│   └── common/
├── pages/
│   ├── auth/
│   ├── boards/
│   └── admin/
├── utils/
│   └── ToastUtils.js
├── api/
│   ├── fetchClient.ts
│   ├── authApi.ts
│   ├── boardApi.ts
│   ├── mypageApi.ts
│   ├── creditApi.ts
│   └── adminApi.ts
└── store/
    ├── slices/
    └── index.ts
```

**Naming Conventions**:
- Folders: lowercase
- Files: camelCase

### Comment Rules

Add comments above:
- Conditional logic
- Navigation logic
- Core business logic

**Rules**:
- No duplicate board layout logic
- Only branch data and rendering methods
- Avoid excessive component splitting

---

## End of Document