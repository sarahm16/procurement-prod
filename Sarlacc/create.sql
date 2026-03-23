-- ============================================
-- SarlaccDB Schema
-- ============================================

-- --------------------------------------------
-- Clients
-- --------------------------------------------
DROP TABLE Clients

CREATE TABLE Clients (
    id                  INT             PRIMARY KEY IDENTITY(1,1),
    client              VARCHAR(100)    NOT NULL,
    mailing_address     VARCHAR(150),
    mailing_address2    VARCHAR(150),
    mailing_city        VARCHAR(100),
    mailing_state       CHAR(2),
    mailing_zipcode     VARCHAR(10),
    lat                 INT,
    lng                 INT,
    billing_address     VARCHAR(150),
    billing_address2    VARCHAR(150),
    billing_city        VARCHAR(100),
    billing_state       CHAR(2),
    billing_zipcode     VARCHAR(10)
);

-- --------------------------------------------
-- Companies (Brands belonging to a Client)
-- --------------------------------------------
CREATE TABLE Companies (
    id          INT             PRIMARY KEY IDENTITY(1,1),
    company     VARCHAR(100)    NOT NULL,
    client_id   INT,                            -- nullable: not all clients are multi-brand
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

-- --------------------------------------------
-- Sites
-- --------------------------------------------
CREATE TABLE Sites (
    id                  INT             PRIMARY KEY IDENTITY(1,1),
    store               VARCHAR(100),
    mailing_address     VARCHAR(150),
    mailing_address2    VARCHAR(150),
    mailing_city        VARCHAR(100),
    mailing_state       CHAR(2),
    mailing_zipcode     VARCHAR(10),
    lat                 INT,
    lng                 INT,
    client_id           INT             NOT NULL,
    company_id          INT,                    -- nullable: not all clients are multi-brand
    FOREIGN KEY (client_id)  REFERENCES Clients(id),
    FOREIGN KEY (company_id) REFERENCES Companies(id)
);

-- --------------------------------------------
-- Service Lines
-- --------------------------------------------
CREATE TABLE Service_Lines (
    id      INT             PRIMARY KEY IDENTITY(1,1),
    name    VARCHAR(100)    NOT NULL
);

-- --------------------------------------------
-- Client Service Lines (many-to-many)
-- --------------------------------------------
CREATE TABLE ClientServiceLines (
    client_id       INT NOT NULL,
    service_line_id INT NOT NULL,
    CONSTRAINT PK_ClientServiceLines PRIMARY KEY (client_id, service_line_id),
    FOREIGN KEY (client_id)       REFERENCES Clients(id),
    FOREIGN KEY (service_line_id) REFERENCES Service_Lines(id)
);

-- --------------------------------------------
-- Site Service Lines (many-to-many)
-- --------------------------------------------
CREATE TABLE SiteServiceLines (
    site_id         INT NOT NULL,
    service_line_id INT NOT NULL,
    CONSTRAINT PK_SiteServiceLines PRIMARY KEY (site_id, service_line_id),
    FOREIGN KEY (site_id)         REFERENCES Sites(id),
    FOREIGN KEY (service_line_id) REFERENCES Service_Lines(id)
);

-- --------------------------------------------
-- Vendor Statuses (global)
-- --------------------------------------------
CREATE TABLE VendorStatuses (
    id          INT             PRIMARY KEY IDENTITY(1,1),
    name        VARCHAR(50)     NOT NULL,   -- 'lead', 'sourcing', 'onboarded', 'active', 'terminated'
    description VARCHAR(200)
);

-- --------------------------------------------
-- Vendor Site Statuses (assignment-level)
-- --------------------------------------------
CREATE TABLE VendorSiteStatuses (
    id          INT             PRIMARY KEY IDENTITY(1,1),
    name        VARCHAR(50)     NOT NULL,   -- 'onboarding', 'active', 'paused', 'terminated-refused', 'terminated-capacity'
    category    VARCHAR(20)     NOT NULL,   -- 'onboarding', 'active', 'paused', 'terminated'
    description VARCHAR(200)
);

-- --------------------------------------------
-- Vendors
-- --------------------------------------------
CREATE TABLE Vendors (
    id                  INT             PRIMARY KEY IDENTITY(1,1),
    company             VARCHAR(100)    NOT NULL,
    mailing_address     VARCHAR(150),
    mailing_address2    VARCHAR(150),
    mailing_city        VARCHAR(100),
    mailing_state       CHAR(2),
    mailing_zipcode     VARCHAR(10),
    lat                 INT,
    lng                 INT,
    billing_address     VARCHAR(150),
    billing_address2    VARCHAR(150),
    billing_city        VARCHAR(100),
    billing_state       CHAR(2),
    billing_zipcode     VARCHAR(10),
    status_id           INT,
    FOREIGN KEY (status_id) REFERENCES VendorStatuses(id)
);

-- --------------------------------------------
-- Vendor Sites (many-to-many)
-- --------------------------------------------
CREATE TABLE VendorSites (
    vendor_id   INT NOT NULL,
    site_id     INT NOT NULL,
    CONSTRAINT PK_VendorSites PRIMARY KEY (vendor_id, site_id),
    FOREIGN KEY (vendor_id) REFERENCES Vendors(id),
    FOREIGN KEY (site_id)   REFERENCES Sites(id)
);

-- --------------------------------------------
-- Vendor Site Service Lines
-- (three-way junction: vendor + site + service line)
-- Stores primary flag and assignment-level status
-- --------------------------------------------
CREATE TABLE VendorSiteServiceLines (
    vendor_id       INT         NOT NULL,
    site_id         INT         NOT NULL,
    service_line_id INT         NOT NULL,
    is_primary      BIT         NOT NULL DEFAULT 0,
    status_id       INT         NOT NULL,
    CONSTRAINT PK_VendorSiteServiceLines PRIMARY KEY (vendor_id, site_id, service_line_id),
    FOREIGN KEY (vendor_id)       REFERENCES Vendors(id),
    FOREIGN KEY (site_id)         REFERENCES Sites(id),
    FOREIGN KEY (service_line_id) REFERENCES Service_Lines(id),
    FOREIGN KEY (status_id)       REFERENCES VendorSiteStatuses(id)
);-- Write your own SQL object definition here, and it'll be included in your package.
