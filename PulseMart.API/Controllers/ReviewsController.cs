using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PulseMart.API.Data;
using PulseMart.API.Models;

namespace PulseMart.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReviewsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReviews()
        {
            var reviews = await _context.ProductReviews
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpPost]
        public async Task<IActionResult> AddReview([FromBody] ProductReview review)
        {
            if (string.IsNullOrWhiteSpace(review.CustomerName) || string.IsNullOrWhiteSpace(review.Comment))
                return BadRequest(new { message = "Customer name and comment are required." });

            review.CreatedAt = DateTime.UtcNow;
            _context.ProductReviews.Add(review);
            await _context.SaveChangesAsync();
            return Ok(review);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.ProductReviews.FindAsync(id);
            if (review == null) return NotFound();

            _context.ProductReviews.Remove(review);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Review deleted." });
        }
    }
}