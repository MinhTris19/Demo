CREATE DATABASE LinguaHub;
GO
USE LinguaHub;
GO
CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL,
    IsAdmin BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO
INSERT INTO dbo.Users (FullName, Email, Username, PasswordHash, Role, IsAdmin)
VALUES ('System Admin', 'admin@linguahub.local', 'admin', '123456', 'admin', 1);
GO
