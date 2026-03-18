#!/usr/bin/env python3
"""Expand mock data with Denver,CO and Tampa,FL markets."""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def load(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return json.load(f)

def save(name, data):
    with open(os.path.join(DATA_DIR, name), "w") as f:
        json.dump(data, f, indent=2)
    print(f"  {name}: {len(data)} items")

# ─── Load existing ───
properties = load("property_listings.json")
comps = load("rental_comparables.json")
sales = load("comparable_sales.json")
bookings = load("bookings.json")
accounting = load("accounting.json")

# Check if already expanded
if any(p["id"].startswith("prop-den") for p in properties):
    print("Already expanded! Skipping.")
    exit(0)

# ─── Denver Properties ───
properties.extend([
    {"id":"prop-den-001","address":"2845 W 26th Ave","city":"Denver","state":"CO","zip":"80211","bedrooms":3,"bathrooms":2,"sqft":1580,"listPrice":525000,"propertyType":"Single Family","daysOnMarket":12,"lat":39.7582,"lng":-105.0125,"imageUrl":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9","description":"Highland renovation with rooftop deck and mountain views. Walking distance to LoHi restaurants."},
    {"id":"prop-den-002","address":"1924 S Pearl St","city":"Denver","state":"CO","zip":"80210","bedrooms":4,"bathrooms":3,"sqft":2150,"listPrice":685000,"propertyType":"Single Family","daysOnMarket":21,"lat":39.6832,"lng":-104.9882,"imageUrl":"https://images.unsplash.com/photo-1600585154526-990dced4db0d","description":"Platt Park charmer near University of Denver. Original kitchen, needs updating, fenced yard."},
    {"id":"prop-den-003","address":"3310 Navajo St","city":"Denver","state":"CO","zip":"80211","bedrooms":2,"bathrooms":2,"sqft":1180,"listPrice":435000,"propertyType":"Townhome","daysOnMarket":8,"lat":39.7615,"lng":-105.0102,"imageUrl":"https://images.unsplash.com/photo-1570129477492-45c003edd2be","description":"Modern LoHi townhome with updated finishes and private garage. Steps from restaurants and nightlife."},
    {"id":"prop-den-004","address":"4720 E Colfax Ave","city":"Denver","state":"CO","zip":"80220","bedrooms":3,"bathrooms":2,"sqft":1420,"listPrice":395000,"propertyType":"Single Family","daysOnMarket":28,"lat":39.7401,"lng":-104.9382,"imageUrl":"https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6","description":"Park Hill bungalow with potential. Dated interior, hvac needs replacement, strong bones."},
    {"id":"prop-den-005","address":"1577 Vine St","city":"Denver","state":"CO","zip":"80206","bedrooms":5,"bathrooms":3,"sqft":2680,"listPrice":875000,"propertyType":"Single Family","daysOnMarket":15,"lat":39.7458,"lng":-104.9612,"imageUrl":"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde","description":"City Park adjacent estate with pool and hot tub. Premium group booking potential near museum district."},
])

# ─── Tampa Properties ───
properties.extend([
    {"id":"prop-tpa-001","address":"3412 W San Jose St","city":"Tampa","state":"FL","zip":"33629","bedrooms":3,"bathrooms":2,"sqft":1540,"listPrice":465000,"propertyType":"Single Family","daysOnMarket":14,"lat":27.9337,"lng":-82.5082,"imageUrl":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c","description":"South Tampa bungalow near Bayshore Boulevard. Updated kitchen, screened patio, walkable to shops."},
    {"id":"prop-tpa-002","address":"1208 E 11th Ave","city":"Tampa","state":"FL","zip":"33605","bedrooms":4,"bathrooms":3,"sqft":2080,"listPrice":520000,"propertyType":"Single Family","daysOnMarket":19,"lat":27.9605,"lng":-82.4325,"imageUrl":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6","description":"Ybor City adjacent with historic character. Needs work — original bathrooms, dated exterior, investor potential."},
    {"id":"prop-tpa-003","address":"5028 W Platt St","city":"Tampa","state":"FL","zip":"33609","bedrooms":2,"bathrooms":2,"sqft":1180,"listPrice":350000,"propertyType":"Condo","daysOnMarket":7,"lat":27.9402,"lng":-82.5205,"imageUrl":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2","description":"Westshore district condo with pool access and gym. Turnkey condition, close to airport and convention center."},
    {"id":"prop-tpa-004","address":"2915 W Bay to Bay Blvd","city":"Tampa","state":"FL","zip":"33629","bedrooms":3,"bathrooms":2,"sqft":1750,"listPrice":580000,"propertyType":"Single Family","daysOnMarket":24,"lat":27.9182,"lng":-82.5092,"imageUrl":"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c0","description":"Palma Ceia craftsman with deck and outdoor entertaining space. Near Bayshore, strong weekend demand."},
    {"id":"prop-tpa-005","address":"8124 Interbay Blvd","city":"Tampa","state":"FL","zip":"33616","bedrooms":4,"bathrooms":3,"sqft":2350,"listPrice":495000,"propertyType":"Single Family","daysOnMarket":31,"lat":27.8962,"lng":-82.4882,"imageUrl":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c","description":"Interbay home with fenced yard, near MacDill AFB. Fixer with curb appeal potential."},
])

# ─── Denver Rental Comps ───
comps.extend([
    {"id":"comp-den-001","locationKey":"Denver,CO","source":"Airbnb","name":"Highland Modern 3BR","bedrooms":3,"bathrooms":2,"adr":265,"occupancyRate":0.71,"reviews":98,"distanceMiles":1.1,"propertyType":"Entire home"},
    {"id":"comp-den-002","locationKey":"Denver,CO","source":"Vrbo","name":"LoHi Townhome Suite","bedrooms":2,"bathrooms":2,"adr":215,"occupancyRate":0.74,"reviews":67,"distanceMiles":0.8,"propertyType":"Entire home"},
    {"id":"comp-den-003","locationKey":"Denver,CO","source":"Airbnb","name":"City Park Victorian 4BR","bedrooms":4,"bathrooms":3,"adr":345,"occupancyRate":0.68,"reviews":142,"distanceMiles":2.1,"propertyType":"Entire home"},
    {"id":"comp-den-004","locationKey":"Denver,CO","source":"Airbnb","name":"Park Hill Family Home","bedrooms":3,"bathrooms":2,"adr":248,"occupancyRate":0.66,"reviews":55,"distanceMiles":3.2,"propertyType":"Entire home"},
    {"id":"comp-den-005","locationKey":"Denver,CO","source":"Vrbo","name":"Platt Park Retreat","bedrooms":4,"bathrooms":2,"adr":310,"occupancyRate":0.70,"reviews":89,"distanceMiles":2.8,"propertyType":"Entire home"},
    {"id":"comp-den-006","locationKey":"Denver,CO","source":"Airbnb","name":"Capitol Hill Loft 2BR","bedrooms":2,"bathrooms":1,"adr":185,"occupancyRate":0.78,"reviews":210,"distanceMiles":1.5,"propertyType":"Entire home"},
])

# ─── Tampa Rental Comps ───
comps.extend([
    {"id":"comp-tpa-001","locationKey":"Tampa,FL","source":"Airbnb","name":"South Tampa Bungalow 3BR","bedrooms":3,"bathrooms":2,"adr":235,"occupancyRate":0.73,"reviews":115,"distanceMiles":1.3,"propertyType":"Entire home"},
    {"id":"comp-tpa-002","locationKey":"Tampa,FL","source":"Vrbo","name":"Bayshore Family Home","bedrooms":4,"bathrooms":3,"adr":305,"occupancyRate":0.69,"reviews":78,"distanceMiles":1.8,"propertyType":"Entire home"},
    {"id":"comp-tpa-003","locationKey":"Tampa,FL","source":"Airbnb","name":"Ybor Historic Loft","bedrooms":2,"bathrooms":1,"adr":175,"occupancyRate":0.76,"reviews":195,"distanceMiles":2.5,"propertyType":"Entire home"},
    {"id":"comp-tpa-004","locationKey":"Tampa,FL","source":"Airbnb","name":"Westshore Condo Near Airport","bedrooms":2,"bathrooms":2,"adr":195,"occupancyRate":0.80,"reviews":230,"distanceMiles":0.9,"propertyType":"Entire home"},
    {"id":"comp-tpa-005","locationKey":"Tampa,FL","source":"Vrbo","name":"Palma Ceia Craftsman","bedrooms":3,"bathrooms":2,"adr":258,"occupancyRate":0.72,"reviews":62,"distanceMiles":1.6,"propertyType":"Entire home"},
    {"id":"comp-tpa-006","locationKey":"Tampa,FL","source":"Airbnb","name":"Interbay 4BR Pool Home","bedrooms":4,"bathrooms":3,"adr":285,"occupancyRate":0.67,"reviews":43,"distanceMiles":3.1,"propertyType":"Entire home"},
])

# ─── Denver Comparable Sales ───
sales.extend([
    {"id":"sold-den-001","address":"2910 W 27th Ave","city":"Denver","state":"CO","zip":"80211","bedrooms":3,"bathrooms":2,"sqft":1540,"soldPrice":560000,"soldDate":"2025-10-05","qualityLevel":"renovated","pricePerSqft":364},
    {"id":"sold-den-002","address":"1880 S Gaylord St","city":"Denver","state":"CO","zip":"80210","bedrooms":4,"bathrooms":3,"sqft":2200,"soldPrice":715000,"soldDate":"2025-09-20","qualityLevel":"renovated","pricePerSqft":325},
    {"id":"sold-den-003","address":"3405 Shoshone St","city":"Denver","state":"CO","zip":"80211","bedrooms":2,"bathrooms":2,"sqft":1220,"soldPrice":425000,"soldDate":"2025-11-12","qualityLevel":"updated","pricePerSqft":348},
    {"id":"sold-den-004","address":"4605 E 16th Ave","city":"Denver","state":"CO","zip":"80220","bedrooms":3,"bathrooms":2,"sqft":1380,"soldPrice":410000,"soldDate":"2025-08-30","qualityLevel":"original","pricePerSqft":297},
    {"id":"sold-den-005","address":"1610 Race St","city":"Denver","state":"CO","zip":"80206","bedrooms":5,"bathrooms":3,"sqft":2750,"soldPrice":920000,"soldDate":"2025-07-15","qualityLevel":"renovated","pricePerSqft":335},
])

# ─── Tampa Comparable Sales ───
sales.extend([
    {"id":"sold-tpa-001","address":"3505 W San Miguel St","city":"Tampa","state":"FL","zip":"33629","bedrooms":3,"bathrooms":2,"sqft":1580,"soldPrice":485000,"soldDate":"2025-10-18","qualityLevel":"renovated","pricePerSqft":307},
    {"id":"sold-tpa-002","address":"1115 E 10th Ave","city":"Tampa","state":"FL","zip":"33605","bedrooms":4,"bathrooms":3,"sqft":2100,"soldPrice":510000,"soldDate":"2025-09-05","qualityLevel":"updated","pricePerSqft":243},
    {"id":"sold-tpa-003","address":"5115 W Platt St","city":"Tampa","state":"FL","zip":"33609","bedrooms":2,"bathrooms":2,"sqft":1200,"soldPrice":355000,"soldDate":"2025-11-20","qualityLevel":"renovated","pricePerSqft":296},
    {"id":"sold-tpa-004","address":"2820 W Bayshore Ct","city":"Tampa","state":"FL","zip":"33629","bedrooms":3,"bathrooms":2,"sqft":1700,"soldPrice":595000,"soldDate":"2025-08-22","qualityLevel":"renovated","pricePerSqft":350},
    {"id":"sold-tpa-005","address":"8210 Interbay Blvd","city":"Tampa","state":"FL","zip":"33616","bedrooms":4,"bathrooms":3,"sqft":2400,"soldPrice":480000,"soldDate":"2025-07-28","qualityLevel":"original","pricePerSqft":200},
])

# ─── Bookings for Denver and Tampa ───
bk_id = len(bookings) + 1
months_data = [("07","July"),("08","August"),("09","September"),("10","October"),("11","November"),("12","December")]
guests_den = ["M. Chen","S. Patel","A. Johnson","K. Williams","D. Lee","R. Garcia","T. Brown","L. Kim","J. Martinez","C. Davis","N. Wilson","P. Taylor"]
guests_tpa = ["B. Anderson","F. Thomas","G. Jackson","H. White","I. Harris","V. Robinson","W. Clark","X. Lewis","Y. Young","Z. King","A. Scott","E. Adams"]

for i, (mo, moname) in enumerate(months_data):
    for j in range(2):
        day1 = 1 + j * 12
        nights = 3 + (j % 3)
        rev = int(265 * nights * (0.9 + j * 0.1))
        bookings.append({
            "id": f"bk-{bk_id:03d}",
            "propertyId": "prop-den-001",
            "checkIn": f"2025-{mo}-{day1:02d}",
            "checkOut": f"2025-{mo}-{day1 + nights:02d}",
            "nights": nights,
            "revenue": rev,
            "source": "Airbnb" if j == 0 else "Vrbo",
            "guestName": guests_den[(i * 2 + j) % len(guests_den)]
        })
        bk_id += 1
    for j in range(2):
        day1 = 3 + j * 11
        nights = 4 + (j % 2)
        rev = int(235 * nights * (0.95 + j * 0.05))
        bookings.append({
            "id": f"bk-{bk_id:03d}",
            "propertyId": "prop-tpa-001",
            "checkIn": f"2025-{mo}-{day1:02d}",
            "checkOut": f"2025-{mo}-{day1 + nights:02d}",
            "nights": nights,
            "revenue": rev,
            "source": "Airbnb" if j == 0 else "Vrbo",
            "guestName": guests_tpa[(i * 2 + j) % len(guests_tpa)]
        })
        bk_id += 1

# ─── Accounting for Denver and Tampa ───
acc_id = len(accounting) + 1
for pid, base_income in [("prop-den-001", 2400), ("prop-tpa-001", 2100)]:
    util_cost = 320 if "den" in pid else 290
    for mo, moname in months_data:
        income = base_income + ((int(mo) - 7) * 50)
        mgmt = int(income * 0.15)
        entries = [
            ("rental_income", f"{moname} rental income (Airbnb + Vrbo)", income, "income"),
            ("cleaning", f"{moname} turnover cleaning", int(income * 0.06), "expense"),
            ("utilities", f"{moname} utilities (electric, water, internet)", util_cost, "expense"),
            ("supplies", f"{moname} guest supplies and consumables", 135, "expense"),
            ("management", f"{moname} property management fee (15%)", mgmt, "expense"),
            ("maintenance", f"{moname} maintenance and repairs", int(income * 0.04), "expense"),
        ]
        for cat, desc, amt, typ in entries:
            accounting.append({
                "id": f"acc-{acc_id:03d}",
                "propertyId": pid,
                "date": f"2025-{mo}-28",
                "category": cat,
                "description": desc,
                "amount": amt,
                "type": typ
            })
            acc_id += 1

# ─── Save all ───
print("Saving expanded data:")
save("property_listings.json", properties)
save("rental_comparables.json", comps)
save("comparable_sales.json", sales)
save("bookings.json", bookings)
save("accounting.json", accounting)
print("Done!")
