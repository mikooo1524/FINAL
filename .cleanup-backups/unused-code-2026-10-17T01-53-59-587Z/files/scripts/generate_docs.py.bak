"""Generate the course submission PDF using actual captured app screens.
Set EVENTGEAR_TEAM_MEMBERS before running to include your real team names.
"""
from pathlib import Path
import os
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
# Embed actual fonts for reliable PDF rendering across devices.
FONT_ROOT = Path(os.environ.get('EVENTGEAR_FONT_ROOT', '/usr/share/fonts/truetype/dejavu'))
if FONT_ROOT.exists():
    pdfmetrics.registerFont(TTFont('EGRegular', str(FONT_ROOT / 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont('EGBold', str(FONT_ROOT / 'DejaVuSans-Bold.ttf')))
    pdfmetrics.registerFontFamily('EGRegular', normal='EGRegular', bold='EGBold')
else:
    # Standard PDF fonts are supported when generating on Windows/macOS.
    from reportlab.pdfbase.pdfmetrics import Font
    pdfmetrics.registerFont(Font('EGRegular', 'Helvetica', 'WinAnsiEncoding'))
    pdfmetrics.registerFont(Font('EGBold', 'Helvetica-Bold', 'WinAnsiEncoding'))
    pdfmetrics.registerFontFamily('EGRegular', normal='EGRegular', bold='EGBold')
OUT = ROOT / 'docs' / 'EventGear_Documentation.pdf'
W, H = A4
NAVY, TEAL, MUTED, LIGHT = map(HexColor, ['#0B1F3A', '#087E80', '#677489', '#F4F7FA'])
c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('EventGear - CS15L System Documentation')
c.setAuthor(os.environ.get('EVENTGEAR_TEAM_MEMBERS', 'EventGear team - names to be supplied'))
body = ParagraphStyle('body', fontName='EGRegular', fontSize=10, leading=15, textColor=NAVY)
small = ParagraphStyle('small', parent=body, fontSize=8.5, leading=12)
page = 0

def para(text, x, y, width=W-88, style=body):
    p = Paragraph(text, style); _, height = p.wrap(width, H)
    p.drawOn(c, x, y-height); return y-height-12

def start(title, subtitle):
    global page
    page += 1
    c.setFillColor(NAVY); c.rect(0, H-95, W, 95, fill=1, stroke=0)
    c.setFillColor(white); c.setFont('EGBold', 22); c.drawString(44, H-46, title)
    c.setFont('EGRegular', 9); c.drawString(44, H-70, subtitle)
    c.setFillColor(MUTED); c.setFont('EGRegular', 8)
    c.drawString(44, 27, 'EVENTGEAR  |  CS15L Programming Languages  |  October 2026')
    c.drawRightString(W-44, 27, str(page))
    return H-119

def heading(text, y):
    c.setFillColor(TEAL); c.setFont('EGBold', 13); c.drawString(44, y, text); return y-17

def table(rows, widths, y):
    data = [[Paragraph(escape(str(cell)), small) for cell in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIGHT),('VALIGN',(0,0),(-1,-1),'TOP'),
      ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
      ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
      ('LINEBELOW',(0,0),(-1,-1),0.4,HexColor('#DCE4EC'))]))
    _, height=t.wrap(W-88,H);t.drawOn(c,44,y-height);return y-height-18

def screens(title, subtitle, entries):
    start(title,subtitle)
    for i,(filename,label) in enumerate(entries):
        col,row=i%2,i//2
        x=54+col*255;top=H-119-row*344
        c.setFillColor(NAVY);c.setFont('EGBold',10);c.drawString(x,top,label)
        # Scale the entire viewport, retaining the real layout rather than cropping.
        c.drawImage(str(ROOT/'docs'/'screenshots'/f'{filename}.png'),x+42,top-314,width=139,height=301,mask='auto')
    c.showPage()

# Cover / summary.
y=start('EventGear','Event equipment rentals, made simple.')
c.drawImage(str(ROOT/'assets'/'icon.png'),44,y-104,width=96,height=96,mask='auto')
c.setFillColor(NAVY);c.setFont('EGBold',25);c.drawString(160,y-30,'Rent. Reserve. Manage.')
para('Offline React Native rental system<br/>Customer / Supplier / Administrator',160,y-48,330)
y-=137
y=heading('App description and target users',y)
y=para('EventGear organizes event-equipment rentals for parties, school programs, church activities and community events. Customers select equipment and rental dates; suppliers maintain stock and confirm bookings; administrators manage contact records and monitor operations. SQLite stores the complete local transaction.',44,y)
y=heading('Team members',y)
y=para(escape(os.environ.get('EVENTGEAR_TEAM_MEMBERS','Names not supplied. Add actual team members before submission.')),44,y)
y=heading('Tech stack',y)
y=table([['Layer','Technology'],['Interface','React Native 0.86 / React 19 / Expo SDK 57'],['Navigation','Expo Router using React Navigation: Stack and nested bottom Tabs'],['Database','expo-sqlite; eventgear.db; foreign keys and indexed booking queries'],['State','React Context, useState, useEffect, useCallback and focus refresh'],['Quality','ESLint, 15 SQLite/lock tests, web workflow checks, Android/Web exports']], [105,W-193],y)
y=para('<b>Delivery scope:</b> functional local course system. Roles are demo entry points; payments record an intended method only. No secure login, hosted synchronization or real financial processing is connected.',44,y)
y=para('<b>Submission items still needed:</b> actual team names, a team GitHub URL, and an installable APK built and tested using your Expo account or Android Studio.',44,y)
c.showPage()

screens('Customer experience','Actual running web app captured at a 390 x 844 phone viewport.',[
 ('02-customer-home','01  Customer dashboard'),('06-cart','02  Persistent cart'),('07-booking','03  Dates and customer input'),('10-reservation-success','04  Saved reservation')])
screens('Supplier experience','Create, read, update and delete listings; review customer bookings.',[
 ('13-supplier-dashboard','01  Supplier dashboard'),('14-supplier-equipment','02  Equipment management'),('15-equipment-form','03  Create / edit form'),('16-supplier-reservations','04  Reservation review')])
screens('Administrator experience','Live SQLite totals, local user records and activity reporting.',[
 ('17-admin-dashboard','01  Administrator overview'),('18-admin-users','02  User directory CRUD'),('19-admin-reports','03  Reports and audit log'),('05-cart-confirmation','04  Cross-platform confirmations')])

y=start('Database and data flow','All records are stored locally in eventgear.db using SQLite.')
y=table([['Table','Main fields and relationships'],
 ['users','user_id PK; name; contact; role (customer/supplier/admin). Demo IDs 1/2/3 are protected.'],
 ['equipment','equipment_id PK; supplier_id FK -> users; name/category/description; daily_rate; total_quantity; image_ref; is_active.'],
 ['reservations','reservation_id PK; unique booking_code; customer_id FK -> users; start/end dates; booking_contact; event_note; status; payment-method demo; total_amount; created_at.'],
 ['reservation_items','item_id PK; reservation_id FK -> reservations; equipment_id FK -> equipment; quantity; daily_rate_at_booking; line_total.'],
 ['cart_items','equipment_id PK/FK -> equipment (ON DELETE CASCADE); quantity.'],
 ['audit_log','audit_id PK; action; details; created_at. Administrator reads latest 50.'],
 ['app_settings','key PK; value. Seed marker prevents deleted catalogs from reseeding.']], [106,W-194],y)
y=heading('Transaction flow',y)
y=para('Cart + dates/contact/note -> availability check -> checkout draft -> method selection -> queued SQLite transaction -> validate current stock/prices -> insert reservation and items -> clear saved cart -> audit -> refresh rental history.',44,y)
y=heading('Integrity rules',y)
y=para('Rental dates are valid calendar dates and days are inclusive. Pending/confirmed reservations hold stock. Peak concurrent use determines availability. Quantities must be positive integers; rates are finite and nonnegative. Parameter binding protects queries from input being interpreted as SQL. A failed transaction rolls back all its writes.',44,y)
y=para('Pending -> confirmed/cancelled; confirmed -> completed/cancelled. Terminal statuses cannot be reopened, and completion waits until the end date. Equipment with active bookings cannot be deleted or reduced below committed stock. Historical listings are archived; unreferenced listings are physically deleted.',44,y)
c.showPage()

y=start('Requirements and validation','Mapping to the supplied CS15L final-project instructions.')
y=table([['PDF requirement','Evidence / status'],
 ['Custom branding','Custom calendar/EG SVG and launcher assets; consistent navy/teal UI.'],
 ['Four+ screens / navigation','Three dashboards plus functional catalog/cart/booking/rental/CRUD/report screens; React Navigation via Expo Router.'],
 ['Meaningful transaction','User-input reservation updates SQLite and appears in rental history/details.'],
 ['Database CRUD','Create/read/update/delete equipment and user records; create/read/update bookings.'],
 ['Modern UI / React Native','Responsive layouts; components/hooks/props/events/FlatList/forms/Context; confirmations and loading/error/empty states.'],
 ['Documentation / presentation','This PDF, actual screen PNGs, README, requirement checklist and demo/Q&A guide.'],
 ['APK / GitHub / team members','Build configuration and instructions supplied. Actual APK, repository URL and names remain team actions.']], [144,W-232],y)
y=heading('Checks completed',y)
y=para('15 automated tests passed, executing the production SQL in real SQLite. Coverage includes idempotent schema/seed, calendar dates, equipment/user CRUD, booking totals and atomic writes, invalid/empty/stale input, concurrency, inclusive overlap/peak availability, lifecycle changes, cancellation, historical records and browser database locks.',44,y)
y=para('ESLint passed. TypeScript configuration check passed (JavaScript checkJs disabled; not full static typing). Android Hermes and Web exports passed. The running Chromium workflow verified cart persistence after reload, customer booking/contact editing, supplier create/delete/confirm, administrator user creation and reports, with no browser runtime errors.',44,y)
y=heading('Verification limits',y)
y=para('Screenshots and UI workflow verification are from the web app at phone and desktop sizes. The Android bundle compiled, but native device installation was not performed. An export bundle is not an APK. Test the built APK on your own Android phone before panel presentation.',44,y)
c.showPage()

y=start('Run, build and present','Complete the remaining submission actions using your team details.')
y=heading('Run locally',y)
y=para('Install Node.js 24 LTS. Extract and open the project in VS Code. Run <b>npm ci</b>, then <b>npx expo start</b>. Use an Expo Go version compatible with SDK 57. Select a demo role on the first screen. For web, export with <b>npx expo export --platform web --output-dir dist-web</b>, then run <b>python scripts/serve_web.py</b> and visit localhost:8765.',44,y)
y=heading('Build the required installable APK',y)
y=para('Use your team Expo account: <b>npx eas-cli login</b>, <b>npx eas-cli build:configure</b>, then <b>npx eas-cli build --platform android --profile preview</b>. The included eas.json preview profile targets APK. Download the completed artifact, install on Android, and test the full demo. Alternatively prebuild Android and use Android Studio to generate a debug APK.',44,y)
y=para('Build reference: <link href="https://docs.expo.dev/build-reference/apk/" color="#087E80">docs.expo.dev/build-reference/apk/</link>. No authenticated Expo account or Android SDK/Gradle toolchain was available for an APK build in this delivery.',44,y,style=small)
y=heading('Hackathon presentation',y)
y=table([['Stage','Suggested content'],['Pitch - 1 minute','Problem: scattered rental records. Users: customers, suppliers, administrator. Benefit: clear bookings and stock checks.'],['Demo - 5 minutes','Logo/home/search -> cart confirmation -> dates/input/checkout -> saved booking -> supplier equipment CRUD/status -> administrator users/reports -> reopen to show persistence.'],['Technical - 2-3 minutes','React Native components/hooks/props; navigation; Context; SQLite schema; queued transaction; snapshots and availability.'],['Q&A','Explain SQLite choice, demo-role scope, payment simulation, archive versus DELETE, validation and test evidence.']], [120,W-208],y)
y=heading('Final submission checklist',y)
y=para('1. Enter real team names and regenerate this PDF using EVENTGEAR_TEAM_MEMBERS.<br/>2. Build and install the APK; verify on a real Android device.<br/>3. Push the complete source/config/assets/database/docs to your team GitHub repository.<br/>4. Submit APK, actual repository link and this documentation PDF through Google Classroom.',44,y)
y=para('Read README.md, docs/REQUIREMENTS_CHECKLIST.md and docs/DEMO_GUIDE.md for detailed instructions and talking points. The live panel presentation and smart attire remain your team responsibilities; the final schedule in the supplied instructions is TBD.',44,y,style=small)
c.save()
print(OUT)
