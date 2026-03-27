#!/usr/bin/env python3
"""Replace generic repeating Unsplash images with unique, location-appropriate photos."""
import json
import os

data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'property_listings.json')

with open(data_path) as f:
    props = json.load(f)

# Unique Unsplash photos matched to property style and location
images = {
    # Austin TX - Texas bungalows, modern farmhouses, ranch homes
    "prop-atx-001": "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&h=600&fit=crop",
    "prop-atx-002": "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop",
    "prop-atx-003": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
    "prop-atx-004": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop",
    "prop-atx-005": "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop",

    # Nashville TN - Victorian, craftsman, new construction, Tudor
    "prop-bna-001": "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&h=600&fit=crop",
    "prop-bna-002": "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&h=600&fit=crop",
    "prop-bna-003": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop",
    "prop-bna-004": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop",
    "prop-bna-005": "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&h=600&fit=crop",

    # Scottsdale AZ - Desert pool, luxury, contemporary, mid-century
    "prop-scf-001": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop",
    "prop-scf-002": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    "prop-scf-003": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop",
    "prop-scf-004": "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&h=600&fit=crop",
    "prop-scf-005": "https://images.unsplash.com/photo-1609950547346-10b600a1eb46?w=800&h=600&fit=crop",

    # Denver CO - Victorian, bungalow, Tudor, row home, traditional
    "prop-den-001": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop",
    "prop-den-002": "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop",
    "prop-den-003": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
    "prop-den-004": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
    "prop-den-005": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop",

    # Tampa FL - Florida ranch, bungalow, pool home, Mediterranean, cottage
    "prop-tpa-001": "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800&h=600&fit=crop",
    "prop-tpa-002": "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&h=600&fit=crop",
    "prop-tpa-003": "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop",
    "prop-tpa-004": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop",
    "prop-tpa-005": "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop",

    # Morrisville VT - Farmhouse, colonial, cabin, country, Victorian
    "prop-mvt-001": "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop",
    "prop-mvt-002": "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop",
    "prop-mvt-003": "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&h=600&fit=crop",
    "prop-mvt-004": "https://images.unsplash.com/photo-1508199422068-2d040deae498?w=800&h=600&fit=crop",
    "prop-mvt-005": "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop",
}

updated = 0
for p in props:
    if p['id'] in images:
        p['imageUrl'] = images[p['id']]
        updated += 1

with open(data_path, 'w') as f:
    json.dump(props, f, indent=2)
    f.write('\n')

unique = len(set(p['imageUrl'] for p in props))
print(f"Updated {updated} images. {unique} unique of {len(props)} total.")
