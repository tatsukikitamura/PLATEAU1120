import { Controller } from "@hotwired/stimulus"
//dafaultでexportできるclassは一つのみ

export default class extends Controller {
  greet() {
    this.element.textContent = "Hello World!"
  }
}
