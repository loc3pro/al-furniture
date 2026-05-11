# MASTER PLAN – ECOMMERCE NỘI THẤT (FINAL VERSION)

Tài liệu này là bản quy hoạch kiến trúc cuối cùng (Final Master Plan) cho hệ thống Website E-commerce Nội thất, hướng tới khả năng scale lớn, tối ưu hóa tỷ lệ chuyển đổi (Conversion Rate) và cực kỳ thân thiện với SEO.

## 🎯 0. Mục tiêu hệ thống
- **SEO top Google**: Cấu trúc URL thân thiện, Schema Markup đầy đủ, tốc độ tải trang nhanh.
- **Tối ưu conversion (bán được hàng)**: Trang web tải mượt, dễ thao tác, có yếu tố thúc đẩy người dùng (Fear of Missing Out - FOMO).
- **Scale traffic lớn**: Kiến trúc chịu tải cao với CDN, ISR và Queue.
- **Dễ vận hành (admin mạnh)**: Quản lý động media, giao diện (màu, logo), thông số, đơn hàng.
- **Tối ưu ads (tracking đầy đủ)**: Google Analytics, Facebook Pixel.

## 🎨 1. UI/UX Philosophy
- **Minimalist + Premium**: Đẹp, tinh tế và sang trọng.
- **Mobile-first**: Thiết kế ưu tiên thiết bị di động.
- **Micro-animation**: Các hiệu ứng tương tác mượt mà làm tăng trải nghiệm cao cấp.
- **Skeleton loading + smooth transition**: Chuyển trang mượt mà không giật lag.
- **Accessibility (a11y)**: Focus keyboard, contrast đủ, alt text ảnh — hỗ trợ SEO và người dùng.

## ⚙️ 2. Tech Stack (FINAL)
**Frontend:**
- **Core**: Next.js (App Router + SSR + ISR).
- **Language**: TypeScript.
- **Styling**: SCSS thuần.
- **State Management**: Redux Toolkit + RTK Query (Thay thế Zustand / React Query).
- **Đăng nhập Google**: **Google Identity Services (GIS)** — **One Tap** (prompt đăng nhập / đăng ký một chạm trên trang) và nút **Sign in with Google**; nhận credential JWT (`credential`) gửi xuống API để xác minh.

**Backend:**
- **API**: Next.js API Routes / Node.js.
- **Database**: PostgreSQL + Prisma ORM.
- **Realtime**: Socket.IO (thay thế Firebase Realtime Database).
- **Search Engine**: Meilisearch (Tìm kiếm siêu tốc, tự sửa lỗi chính tả).
- **Storage**: Firebase Storage (ảnh gốc + biến thể đã resize lưu cùng bucket hoặc prefix).
- **Image processing (Admin / API)**: Sharp (resize, crop, WebP) — xử lý server sau khi upload hoặc trong job queue.
- **Charts (Admin)**: Recharts.
- **Queue/Background Jobs**: Redis (Gửi email, xử lý ảnh nặng, đơn hàng).

**Analytics & Deploy:**
- **Tracking**: Google Analytics, Facebook Pixel.
- **Deploy**: Vercel (Frontend) + Cloudflare CDN.
- **Monitoring/Logging**: Sentry.
- **Transactional email** (qua queue): Resend, AWS SES hoặc tương đương — email xác nhận đơn, giao hàng, **mã/ link xác nhật tài khoản**.
- **SMS / OTP** (khách): Nhà cung cấp gửi SMS tại VN (ESMS, Twilio, AWS SNS, …) — **OTP xác nhận SĐT** khi đăng ký / đăng nhập bằng số điện thoại.
- **OAuth Google**: Google Cloud Console — **OAuth 2.0 Client ID** (Web); backend **verify JWT id_token** (`aud`, `iss`, `exp`, `nonce` khi dùng FedCM/One Tap) — thư viện kiểu `google-auth-library` hoặc verify JWKS Google.

## 🧱 3. Database Schema (FULL)

### Core (Lõi)
- **User**: `id`, `name`, `email` (unique, nullable nếu chỉ dùng SĐT), `phone` (unique, chuẩn hóa E.164 VN), `password` (nullable nếu flow chỉ OTP/magic link / Google), `googleSub` (unique — `sub` từ Google, nullable), `avatarUrl` (optional — ảnh profile Google hoặc upload), `role` (`CUSTOMER`, `ADMIN`, `CONTENT`, `SUPPORT`, …), `emailVerifiedAt`, `phoneVerifiedAt`, `createdAt` — Google đăng nhập coi **email đã xác minh** (`email_verified` trong token); mỗi khách **ít nhất một** định danh đủ tin (email/SĐT/Google — tùy policy).
- **AuthVerification** (hoặc tách `OtpCode` + `EmailVerifyToken`): lưu mã OTP / token một lần, `target` (email | phone), `purpose` (`REGISTER`, `LOGIN`, `VERIFY_EMAIL`, `VERIFY_PHONE`), `expiresAt`, `consumedAt` — rate limit & TTL ngắn.
- **Address**: `id`, `userId`, `address`, `ward`, `district`, `city`.
- **Product**: `id`, `name`, `slug`, `description`, `basePrice`, `categoryId`, `isFeatured`, `viewCount`, `soldCount`, `metaTitle`, `metaDescription` (SEO).
- **ProductVariant** (mỗi dòng = một tổ hợp **màu × kích thước** bán được): `id`, `productId`, `color` (mã hoặc label hiển thị, ví dụ `#3A2E28` + tên “Óc chó”), `size` (vd. `200x100cm`, `1m8`), `priceAdjustment`, `stockQuantity`, `sku`, `imageUrls` — Admin tạo đủ tổ hợp; khách **bắt buộc chọn màu + size** trước khi thêm giỏ / đặt hàng (resolve ra đúng `productVariantId`).
- **Category**: `id`, `name`, `slug`, `parentId`, `metaTitle`, `metaDescription`.

### Order (Đơn hàng & Thanh toán)
- **Order**: `id`, `userId`, `totalAmount`, `shippingAddress`, `paymentMethod`, `couponId`, `campaignId` (nullable — flash sale), `status` (`PENDING`, `FAILED`, `PAID`, `PROCESSING`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `RETURNED`, `REFUNDED`).
- **OrderItem**: `id`, `orderId`, `productVariantId`, `quantity`, `price` (snapshot giá tại thời điểm mua), `discountSnapshot` (optional).
- **PaymentTransaction**: `id`, `orderId`, `provider` (MoMo), `status`, `rawData`, idempotency key để xử lý callback trùng an toàn.

### Marketing & Growth
- **Coupon (ADVANCED)**: `id`, `code`, `discountType`, `discountValue`, `minOrderValue`, `usageLimit`, `usedCount`, `expiryDate`, `userLimit`.
- **Campaign (Flash Sale)**: `id`, `name`, `startAt`, `endAt`, `discount`.
- **Banner**: `id`, `image`, `link`, `active`.

### Content & Customer
- **Blog**: `id`, `title`, `slug`, `content` (HTML), `thumbnail`, `createdAt`, `metaTitle`, `metaDescription`.
- **Review (ADVANCED)**: `id`, `productId`, `userId`, `rating`, `comment`, `images`, `verifiedPurchase`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `createdAt`.
- **Wishlist**: `userId`, `productId`.
- **CRM Lite**: `userId`, `totalSpent`, `orderCount`, `tag` (VIP, NEW).

### Chat & System
- **ChatSession (Socket.IO)**: `id`, `userId`, `status`.
- **ChatMessage**: `sessionId`, `sender`, `message`.
- **ThemeSettings (Branding — đồng bộ Admin “đổi màu / logo”)**: `primaryColor`, `accentColor`, `headerBg`, `menuColor`, `textOnPrimary`, `logoUrl`, `logoDarkUrl` (optional), `faviconUrl`, `footerNote`, `socialLinks` (JSON optional) — áp dụng storefront qua CSS variables / fetch config.
- **FeatureFlag**: `chatEnabled`, `blogEnabled`, `couponEnabled`.
- **InventoryLog**: `productVariantId`, `change`, `reason`.

## 🛍️ 4. Storefront Features
- **Trang chủ & Danh sách**: Liệt kê sản phẩm nổi bật, phân trang.
- **Search (Advanced với Meilisearch)**: Suggest từ khóa, Typo tolerant (Tự sửa lỗi chính tả), Ranking ưu tiên `soldCount > viewCount`.
- **Product Page**: **Chọn biến thể trước khi mua**: UI chọn **màu sắc** (swatch / danh sách) và **kích thước** (dropdown hoặc thẻ); khi đổi màu hoặc size thì cập nhật giá, ảnh gallery, SKU và trạng thái còn hàng theo đúng `ProductVariant` được chọn. Không cho “Mua ngay” / “Thêm giỏ” nếu chưa chọn đủ màu + kích thước (hoặc nếu biến thể đó hết hàng).
- **UX Enhancements**: Hiển thị "Recently viewed", Skeleton loading, Preload page.
- **Conversion Hacks (FOMO)**: Các nhãn "Đã bán X", "Còn lại X sản phẩm", "X người đang xem".

## 🔐 5. Tài khoản khách — đăng nhập & xác nhận
- **Đăng nhập / Đăng ký**: Khách dùng **email hoặc số điện thoại** làm tài khoản định danh (một form, nhập field “Email hoặc SĐT”, backend nhận diện định dạng).
- **Đăng nhập Google — One Tap & Sign in with Google**:
  - Nhúng **GIS** trên storefront; bật **One Tap** khi phù hợp (ưu tiên người đã đăng nhập Google trước đó; có prompt đóng / tuân UX để không làm phiền).
  - Sau khi người dùng chọn tài khoản Google, frontend gửi **credential (JWT)** về API; server verify và **tạo user hoặc đăng nhập** theo `googleSub` / **ghép tài khoản** nếu email trùng tài khoản đã có (policy rõ ràng: auto-link hoặc yêu cầu xác nhận thêm).
  - Tuân **Google branding / FedCM** (trình duyệt mới); test Safari/Firefox vì hành vi One Tap có khác Chrome.
- **Xác nhận (bắt buộc theo policy MVP)**:
  - **SĐT**: Gửi **OTP SMS** (mã 4–6 số, hết hạn vài phút), nhập đúng mới hoàn tất đăng ký hoặc phiên đăng nhập (passwordless) / đổi SĐT.
  - **Email**: Gửi **link xác nhận** hoặc **mã OTP qua email** để xác minh địa chỉ; có thể kết hợp **mật khẩu** sau khi đã xác thực (tùy UX: magic link + optional password).
- **Bảo mật**: Giới hạn số lần gửi OTP / thử mã theo IP + theo số/email; khóa tạm thời khi brute-force; session an toàn (httpOnly cookie hoặc JWT ngắn hạn).
- **Admin / nhân viên**: Có thể tách flow (chỉ email+password nội bộ) — không bắt buộc OTP công khai; map qua `User.role`.

## 🛒 6. Cart & Checkout
- **Cart**: Mỗi dòng giỏ gắn **`productVariantId`** (đã bao gồm màu + kích thước đã chọn), không lưu “sản phẩm trần” không biến thể. Đồng bộ Redux + server.
- **Checkout**: Hiển thị rõ **màu & kích thước** từng mặt hàng trong đơn; form địa chỉ đầy đủ. Thanh toán COD, MoMo.
- **Tồn kho khi checkout**: Reserve/giữ chỗ tồn kho có TTL hợp lý khi bước thanh toán để giảm oversell; webhook MoMo **idempotent** (không cộng đơn/ trừ kho hai lần).
- **Shipping**: Cập nhật tay bởi Admin, User xem timeline tiến trình giao hàng.

## 💬 7. Realtime Chat
- Hệ thống chat sử dụng **Socket.IO**.
- Giao diện Admin chuyên biệt hỗ trợ chat trực tuyến với khách truy cập.

## 📊 8. Admin System (FULL)
- **Product & Order**: CRUD sản phẩm và **danh sách biến thể** (từng cặp màu + size, giá điều chỉnh, tồn, SKU, ảnh riêng nếu cần). Đơn hàng / OrderItem luôn tham chiếu variant — lọc đơn, đổi trạng thái, in/xuất có cột màu & kích thước.
- **Media & ảnh (resize cho đẹp)**: Upload lên Firebase Storage; trong Admin có **crop / resize / tỷ lệ khung** (ví dụ 1:1 thumb, 4:3 banner, max width storefront) — preview trước khi lưu; server generate WebP/đa kích thước bằng **Sharp** (có thể chạy async qua BullMQ cho ảnh lớn). Mục tiêu: ảnh sản phẩm/banner đồng bộ, không méo, tối ưu dung lượng.
- **Theme & Branding (đổi màu, logo, …)**: Màn **Theme Customizer** chỉnh màu chủ đạo, header/menu, upload **logo** (và optional logo dark), **favicon**, ghi chú footer; lưu `ThemeSettings` và reflect realtime storefront (CSS variables). Phân quyền: chỉ `ADMIN` (hoặc role `DESIGN`) được sửa branding.
- **Marketing**: Quản lý Campaign, Coupon.
- **Blog CMS**: Viết bài bằng Rich Text, nhúng HTML.
- **Dashboard (Recharts)**: Biểu đồ doanh thu, số lượng đơn hàng, top sản phẩm bán chạy.
- **Export Data**: Xuất dữ liệu dưới dạng CSV / Excel.
- **RBAC ngắn gọn**: Customer chỉ storefront; Admin full; Content (blog/banner); Support (đơn, chat) — map vào `User.role` và guard API.

## 📈 9. Analytics & Tracking
- **Tracking các Event chính**: View product, Add to cart, Checkout, Purchase.
- **Công cụ**: Cài sẵn Google Analytics & Facebook Pixel.
- **Cookie / consent**: Banner chấp nhận cookie cho tracking (remarketing) — cấu hình trong Admin hoặc env.

## 🧠 10. Growth System (Hệ thống Tăng trưởng)
- **A/B Testing**: Thay đổi banner, nút CTA để thử nghiệm.
- **Recommendation**: Hiển thị sản phẩm liên quan, Combo bán kèm.
- **CRM**: Phân loại người dùng để Remarketing.
- **Landing Page Builder**: Tạo ra các landing page tĩnh phục vụ chạy Ads (Tính năng nâng cao).

## ⚡ 11. Performance & Security
- **Performance**: Dùng ISR cache của Next.js cho trang sản phẩm/danh mục. Tối ưu ảnh WebP, `next/image` + Cloudflare CDN.
- **Security**: Hash mật khẩu (Bcrypt) khi có password; Rate Limit chặn spam, **rate limit OTP / gửi SMS & email**, Validate Input dữ liệu, bảo vệ CSRF; **OAuth**: chỉ chấp nhận id_token Google đúng `aud` (Client ID), kiểm tra `nonce` khi One Tap yêu cầu.

## 🔍 12. SEO kỹ thuật & Sitemap
- **Sitemap XML** (generate theo route hoặc cron): sản phẩm, danh mục, bài blog.
- **`robots.txt`**: Cho phép/chặn bot, trỏ sitemap.
- **Structured Data**: Breadcrumb, Organization, Product (đã nêu ở mục 0 — triển khai đồng bộ field `meta*` trong schema).

## 🧾 13. Vận hành, pháp lý & chất lượng
- **Backup**: PostgreSQL backup định kỳ (theo nhà cung cấp DB/Vercel Postgres).
- **Pháp lý VN (tùy giai đoạn)**: Chính sách đổi trả, COD, ghi nhận nhu cầu hóa đơn điện tử nếu doanh nghiệp yêu cầu sau.
- **Testing & CI**: Lint + unit (pricing/coupon); smoke E2E checkout; CI (GitLab/GitHub) chạy trước merge/deploy.

## 🔄 14. Advanced System
- **Queue Processing**: BullMQ + Redis — email, xử lý ảnh hàng loạt, tác vụ đơn hàng nặng.
- **Multi-store (OPTIONAL)**: 1 Backend nhưng có thể trỏ từ nhiều Domain khác nhau.

## 🧭 15. Roadmap (FINAL)
- **Phase 1 (MVP – ra tiền nhanh)**: Core Product (biến thể **màu + kích thước**), trang chi tiết có chọn variant; **Đăng ký/Đăng nhập**: email hoặc SĐT + xác nhận (OTP SMS + link/mã email) và **Google One Tap + Sign in with Google** (verify token server); Cart & Checkout (COD), Admin tạo variant + đơn hàng; **sitemap/robots cơ bản** + meta SEO mặc định; Admin upload ảnh + **resize đơn giản** (max width + WebP).
- **Phase 2**: Thanh toán MoMo, Meilisearch, Blog; **Theme Customizer** (màu + logo + favicon).
- **Phase 3**: Chat (Socket.IO), Tracking/Analytics, Dashboard (Recharts); media **crop** và queue Sharp cho ảnh nặng.
- **Phase 4**: CRM, Flash Sale Campaign, A/B testing.
- **Phase 5**: Landing Builder, scale queue/Redis, multi-store nếu cần.

---
> [!IMPORTANT]
> Master Plan đã gộp bổ sung: schema SEO & review, tồn kho/thanh toán an toàn, SEO kỹ thuật, vận hành/test; **Admin resize ảnh** và **đổi màu/logo/branding** qua Theme Customizer; **đặt hàng với chọn màu sắc & kích thước** (ProductVariant end-to-end); **khách đăng nhập** email/SĐT **kèm xác nhận** (OTP / email verify) và **Google One Tap / Sign in with Google**.
> Sẵn sàng khởi tạo Next.js và cài đặt thư viện cơ sở cho **Phase 1** khi bạn bắt đầu repo.
