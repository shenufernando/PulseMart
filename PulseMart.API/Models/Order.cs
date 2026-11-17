using System.ComponentModel.DataAnnotations;

namespace PulseMart.API.Models
{
    public class Order
    {
        public int Id { get; set; }

        [Required]
        public string OrderCode { get; set; } = string.Empty;

        [Required]
        public string CustomerName { get; set; } = string.Empty;

        public string? CustomerEmail { get; set; }

        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        public string DeliveryAddress { get; set; } = string.Empty;

        public string SelectedOption { get; set; } = "Standard";

        [Required]
        public string PaymentMethod { get; set; } = "Cash";

        public decimal DeliveryFee { get; set; }

        public decimal TotalPayable { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<OrderItem> Items { get; set; } = new();
    }
}