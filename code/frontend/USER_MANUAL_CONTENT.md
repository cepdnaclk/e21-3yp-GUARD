# G.U.A.R.D User Manual Content

## 1. Purpose and Scope
This manual covers:
1. Hardware components required to run G.U.A.R.D.
2. Software systems and integrations.
3. User interaction units across web, mobile, and IoT device.
4. Step-by-step operational methods by role.

## 2. System Overview
G.U.A.R.D is an IoT aquarium monitoring and control system for multi-tank environments.  
It collects real-time water data from ESP32 sensor units, processes alerts in the backend, and supports operations through:
1. Web dashboard
2. Mobile app
3. Notification channels (in-app, email, Telegram, push)

## 3. Hardware Parts

### 3.1 Core Tank Unit (Per Tank)
1. ESP32-S3 controller board
2. DS18B20 temperature sensor
3. pH analog sensor module
4. TDS analog sensor module
5. Turbidity analog sensor module
6. Ultrasonic water level sensor
7. Servo motor for feeding
8. Fill pump output control
9. Drain pump output control
10. RGB status LED (NeoPixel)
11. Reset button for Wi-Fi config reset

### 3.2 Network and Power
1. Stable DC power supply for controller and actuators
2. Wi-Fi network access
3. TLS-enabled MQTT broker connectivity

### 3.3 Operator Devices
1. Web browser device (desktop/laptop)
2. Mobile phone (Android or iOS)
3. Camera-enabled phone for QR product key scanning (optional)

## 4. Software Parts

### 4.1 Backend and Data Services
1. Node.js + Express API server
2. MongoDB (via Prisma)
3. InfluxDB time-series storage
4. MQTT service
5. Socket.io real-time event service

### 4.2 Client Applications
1. Web frontend dashboard
2. Mobile application

### 4.3 External Integrations
1. SMTP email service for verification and alerts
2. Telegram bot for phone verification and alerts
3. Expo push notifications for mobile
4. Google Sign-In (optional)

## 5. Roles and Permissions
1. Super Admin  
Can manage admins, fish catalog, inventory/device requests, and high-level administration.
2. Admin  
Can register tanks, create workers, assign workers, edit thresholds, control actuators, and monitor alerts/analytics.
3. User (Worker)  
Can monitor assigned tanks, view and resolve accessible alerts, and manage own profile.

## 6. User Interaction Units

### 6.1 IoT Tank Unit (Hardware)
1. Receives threshold configuration from backend
2. Receives manual commands (feed, pump on, pump off)
3. Publishes sensor data and alert events
4. Shows local health state via RGB LED
5. Supports reset-button Wi-Fi reconfiguration

### 6.2 Web Dashboard (Software)
1. Register, login, email verification
2. View dashboard and tank health
3. Register and delete devices
4. Assign or remove workers
5. Edit and sync thresholds
6. Send actuator commands
7. View and resolve alerts
8. View historical analytics and export CSV
9. Fish compatibility and threshold presets
10. Public device-order request submission

### 6.3 Mobile App (Software)
1. Login and forgot password
2. Tank dashboard and details
3. Manual control (feed/pumps)
4. Edit thresholds
5. Manage workers
6. Notifications and resolve
7. Analytics
8. Profile update
9. Push notification enablement

### 6.4 Notification Unit
1. In-dashboard real-time alert updates
2. Email alerts (toggleable)
3. Telegram alerts (toggleable after verification)
4. Mobile push alerts

## 7. Operating Methods (Step-by-Step)

### Method 1: Submit Public Device Order Request
1. Open landing page.
2. Open order form.
3. Enter name, email, contact number, number of devices, optional notes.
4. Submit request.
5. Wait for confirmation.

### Method 2: Register Account
1. Open Sign Up.
2. Enter full name, username, password, and optional email/phone/address.
3. Submit registration.
4. If email verification is required, proceed to verification.

### Method 3: Verify Email
1. Open verification page.
2. Enter username and 6-digit code.
3. Submit.
4. If needed, resend code and retry.

### Method 4: Login
1. Enter username and password or use Google Sign-In.
2. Submit.
3. If blocked by unverified email, complete verification first.

### Method 5: Forgot Password
1. Start reset via username or email flow.
2. Confirm account email.
3. Enter received 6-digit code.
4. Set new password.
5. Login with new password.

### Method 6: Register Tank Device
1. Open device registration page (web or mobile).
2. Enter tank name and product key (or scan QR on mobile).
3. Submit.
4. Confirm tank appears in list/dashboard.

### Method 7: Add Product to Inventory
1. Super Admin opens inventory tools.
2. Enter tank identifier and product key.
3. Save.
4. Product is now claimable by an Admin.

### Method 8: Assign or Unassign Workers
1. Open tank worker management.
2. Select worker.
3. Assign or remove.
4. Confirm update.

### Method 9: Edit Thresholds and Sync
1. Open tank threshold panel.
2. Set new limits for temperature, pH, TDS, turbidity, and water level.
3. Submit update.
4. Confirm sync success.

### Method 10: Send Manual Commands
1. Open tank details.
2. Choose command: Feed, Pump On, or Pump Off.
3. Confirm action.
4. Verify status update.

### Method 11: View and Resolve Alerts
1. Open Notifications/Alerts.
2. Filter by tank or status if needed.
3. Select active alert.
4. Mark as resolved.

### Method 12: Manage Alert Preferences
1. Open alert preferences.
2. Enable or disable email alerts.
3. Enable or disable Telegram alerts.
4. Confirm success message.

### Method 13: View Analytics and History
1. Open Analytics/Sensor History.
2. Select tank and optional sensor/date range.
3. Fetch data.
4. Review chart/table.
5. Export CSV if required.

### Method 14: Update Profile
1. Open Profile.
2. Edit allowed fields.
3. Save changes.
4. Confirm update.

### Method 15: Verify New Email in Profile
1. Enter new email in profile verification flow.
2. Request OTP.
3. Enter OTP.
4. Confirm and save.

### Method 16: Verify Phone via Telegram
1. Enter phone number and request verification code.
2. Send code to official Telegram bot.
3. Use Share Contact in Telegram.
4. Return and confirm verification status.

### Method 17: Enable Mobile Push Notifications
1. Login from physical mobile device.
2. Grant notification permission when prompted.
3. App auto-registers push token.
4. Receive push alerts for critical events.

### Method 18: Fish Catalog and Presets
1. Open Fish Info.
2. Browse/search species and open details.
3. Compare species requirements against selected tank.
4. Admin applies species preset to thresholds.
5. Super Admin can add/edit/delete species and images.

## 8. Device LED Status Guide
1. Green: Normal operation
2. Yellow: Network issue (Wi-Fi or MQTT)
3. White: Sensor fault
4. Red: Water-level alert
5. Purple: Temperature alert
6. Blue: TDS alert
7. Orange: pH alert
8. Cyan: Turbidity alert

## 9. Validation and Constraints
1. Product key must be valid and unclaimed.
2. Device request quantity must be between 1 and 20.
3. Threshold values must be numeric and logically valid.
4. OTP and reset codes expire after configured time.
5. Alert resolution requires role-based tank access.
6. Phone verification requires Telegram contact sharing.
7. Push notifications require permission and physical device.

## 10. Recommended Final Manual Structure
1. Introduction and safety notes
2. Hardware package and wiring summary
3. Roles and access model
4. First-time setup
5. Daily monitoring workflow
6. Alert response workflow
7. Threshold and control workflows
8. User and worker management
9. Notification setup
10. Troubleshooting and support
