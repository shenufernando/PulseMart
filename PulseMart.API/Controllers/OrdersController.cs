using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PulseMart.API.Data;
using PulseMart.API.Models;

namespace PulseMart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OrdersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .OrderByDescending(o => o.Id)
                .ToListAsync();

            return Ok(orders);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] Order order)
        {
            if (order.Items == null || order.Items.Count == 0)
                return BadRequest(new { message = "Order must contain at least one item." });

            foreach (var line in order.Items)
            {
                var product = await _context.Products.FindAsync(line.ProductId);
                if (product == null)
                    return BadRequest(new { message = $"Product #{line.ProductId} not found." });

                if (product.Stock < line.Quantity)
                    return BadRequest(new { message = $"Insufficient stock for {product.Name}." });

                product.Stock -= line.Quantity;
                if (string.IsNullOrWhiteSpace(line.ImageUrl))
                {
                    line.ImageUrl = product.ImageUrl;
                }
            }

            order.CreatedAt = DateTime.UtcNow;
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(order);
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusRequest req)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Status = req.Status;
            await _context.SaveChangesAsync();
            return Ok(order);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound();

            foreach (var line in order.Items)
            {
                var product = await _context.Products.FindAsync(line.ProductId);
                if (product != null)
                {
                    product.Stock += line.Quantity;
                }
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Order deleted and stock restored." });
        }

        public record StatusRequest(string Status);
    }
}