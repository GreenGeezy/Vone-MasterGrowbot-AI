Source: Configuring Products in App Store Connect

Configuring Products in RevenueCat
After creating your RevenueCat project, you must configure the products (in-app purchases) and entitlements. This page shows how to set up products, entitlements, and offerings.

Overview
RevenueCat uses three concepts:

Products: The in-app purchase items (e.g. “Monthly Premium”).
Entitlements: What access the user gets (e.g. “premium”).
Offerings: How products are grouped in your app (optional).
Flow: User purchases a Product → unlocks an Entitlement → your app checks entitlements to grant access.

1. Choose Your Product Type
Development (Test Store): Use the Test Store in RevenueCat for quick setup (no App Store Connect needed).

You can create products directly in RevenueCat (instant test purchases, no real money).
Production (Real Stores): Before App Store submission, configure real store products.

Configure products in App Store Connect (iOS) and in Google Play Console (Android).
Then import those products into RevenueCat.
2. Create Products
With Test Store (Quick Start)
In RevenueCat dashboard, go to Product Catalog → Products.
Select Test Store tab.
Click + New to create a product.
Enter details (Name, Product ID, Price, Duration, etc.).
With Real Stores
Create products in App Store Connect (for Apple) and Google Play Console (for Android).
In RevenueCat, go to Product Catalog → Products.
Select Apple App Store tab (for iOS).
Click Import products and enter the product identifiers from App Store Connect.
3. Create Entitlements
Entitlements represent features or access levels (e.g. “premium”).

In RevenueCat, go to Product Catalog → Entitlements.
Click + New, enter an identifier (e.g. premium) – this is used in code.
Add a description (optional).
Typically one entitlement is enough (for “premium” access).
4. Attach Products to Entitlements
Associate products with entitlements so purchases unlock them:

In Entitlements, click on the entitlement you created (e.g. premium).
In the Products section, click Attach.
Select the product(s) that grant this entitlement.
Save.
Now, when a user purchases that product, they gain the entitlement.
5. Create Offerings (Recommended)
Offerings group products for display, allowing changes without app updates (required for Paywalls, A/B tests, etc.).

Go to Product Catalog → Offerings.
Click + New, give an identifier (e.g. default).
Add Packages to the offering: each package represents an equivalent product on each platform (e.g. monthly subscription on iOS + Android).
The offering named default will be returned by the SDK as currentOffering.
Next Steps
With products configured, you can now:

Install the RevenueCat SDK in your app.
Create a paywall / purchase UI.
Test purchases using the RevenueCat test integrations.
(This file contains instructions from RevenueCat’s “Configuring Products” guide, focusing on App Store Connect configuration for products.)
