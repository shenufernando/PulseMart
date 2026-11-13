import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Keeps track of the currently clicked navigation item
  activeSection: string = 'home';

  constructor(private router: Router) {}

  // Navigates and scrolls smoothly to the requested section
  navigateToSection(sectionId: string) {
    this.activeSection = sectionId;

    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.triggerScroll(sectionId), 100);
      });
    } else {
      this.triggerScroll(sectionId);
    }
  }

  private triggerScroll(sectionId: string) {
    // If Home is clicked, scroll directly to the very top of the page
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}