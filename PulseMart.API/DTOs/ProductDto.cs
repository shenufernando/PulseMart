using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace PulseMart.API.DTOs
{
    public class ProductCreateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int Stock { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        // Accepts an image file directly from the form upload
        public IFormFile? Image { get; set; }
    }

    public class ProductUpdateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int Stock { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        // Optional image file when updating an existing product
        public IFormFile? Image { get; set; }
    }
}