using Microsoft.EntityFrameworkCore;
using PulseMart.API.Models;

namespace PulseMart.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Default Admin Account එක Database එකට ඉබේම ඇතුළත් කිරීම (Data Seeding)
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Name = "System Admin",
                    Email = "admin@pulsemart.com",
                    // මෙතැනදී 'Admin@123' කියන password එක BCrypt වලින් Hash කරලා දාලා තියෙනවා
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = "Admin"
                }
            );
        }
    }
}