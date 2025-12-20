
import { jsPDF } from "jspdf";
import { ResumeData, TemplateConfig, TemplateId } from "../types";
import { TEMPLATES } from "./docxGenerator";

export class PdfGenerator {
  generate(data: ResumeData, templateId: TemplateId = 'modern'): Blob {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    
    const config = TEMPLATES[templateId];
    // Set Margin to approx 0.35 inch (25 pt)
    const margin = 25; 
    let y = margin + 10; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    
    // Balanced Line Height
    const lineHeight = 13; 

    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin + 20;
      }
    };

    // --- Header ---
    doc.setFont(config.fonts.heading === "Times New Roman" ? "times" : "helvetica", "bold");
    doc.setFontSize(12); // Name 12pt (Title Size)
    doc.setTextColor(config.colors.primary);
    
    const name = (data.fullName || "YOUR NAME").toUpperCase();
    const nameWidth = doc.getTextWidth(name);
    let xName = margin;
    if (config.layout.headerAlignment === 'center') xName = (pageWidth - nameWidth) / 2;
    
    doc.text(name, xName, y);
    y += 16; 

    // Contact Info (Phone | Email | LinkedIn)
    doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "normal");
    doc.setFontSize(9); 
    doc.setTextColor(config.colors.secondary);

    const separator = config.layout.headerAlignment === 'center' ? "  |  " : "  •  ";
    const separatorWidth = doc.getTextWidth(separator);

    const phone = data.phone || "";
    const email = data.email || "";
    const linkedin = data.linkedin || "";
    const linkedinDisplay = "LinkedIn"; // Fixed text

    // Calculate widths
    const pWidth = phone ? doc.getTextWidth(phone) : 0;
    const eWidth = email ? doc.getTextWidth(email) : 0;
    const lWidth = linkedin ? doc.getTextWidth(linkedinDisplay) : 0;

    // Calculate total width of the line
    let totalWidth = 0;
    if (phone) totalWidth += pWidth;
    if (email) totalWidth += (totalWidth > 0 ? separatorWidth : 0) + eWidth;
    if (linkedin) totalWidth += (totalWidth > 0 ? separatorWidth : 0) + lWidth;

    let currentX = margin;
    if (config.layout.headerAlignment === 'center') {
        currentX = (pageWidth - totalWidth) / 2;
    }

    // Render Phone
    if (phone) {
        doc.text(phone, currentX, y);
        currentX += pWidth;
    }

    // Render Email with Link
    if (email) {
        if (phone) {
            doc.text(separator, currentX, y);
            currentX += separatorWidth;
        }
        doc.setTextColor(config.colors.primary); // Highlight link
        doc.textWithLink(email, currentX, y, { url: `mailto:${email}` });
        doc.setTextColor(config.colors.secondary); // Reset color
        currentX += eWidth;
    }

    // Render LinkedIn with Link
    if (linkedin) {
        if (phone || email) {
            doc.text(separator, currentX, y);
            currentX += separatorWidth;
        }
        const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
        doc.setTextColor(config.colors.primary); // Highlight link
        doc.textWithLink(linkedinDisplay, currentX, y, { url: linkedinUrl });
        doc.setTextColor(config.colors.secondary); // Reset color
        currentX += lWidth;
    }

    y += 12;
    
    // Header Line
    doc.setDrawColor(226, 232, 240); // E2E8F0
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18; 

    // --- Sections ---
    const renderSection = (title: string, contentRenderer: () => void) => {
      checkPageBreak(40);
      
      // Section Header - 12pt
      doc.setFont(config.fonts.heading === "Times New Roman" ? "times" : "helvetica", "bold");
      doc.setFontSize(12); 
      doc.setTextColor(config.colors.primary);
      
      doc.text(title.toUpperCase(), margin, y);
      
      if (config.layout.sectionHeaderStyle === 'border-bottom') {
         y += 4;
         doc.setDrawColor(config.colors.primary);
         doc.line(margin, y, pageWidth - margin, y);
         y += 12; 
      } else {
         y += 14; 
      }

      contentRenderer();
      y += 14; 
    };

    // Summary
    if (data.summary) {
      renderSection("PROFESSIONAL SUMMARY", () => {
        doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(config.colors.text);
        
        const splitText = doc.splitTextToSize(data.summary, contentWidth);
        checkPageBreak(splitText.length * lineHeight);
        doc.text(splitText, margin, y, { align: 'justify', maxWidth: contentWidth });
        y += splitText.length * lineHeight;
      });
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      renderSection("CORE COMPETENCIES", () => {
        doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(config.colors.text);
        
        const skillsStr = data.skills.join("  •  ");
        const splitText = doc.splitTextToSize(skillsStr, contentWidth);
        checkPageBreak(splitText.length * lineHeight);
        
        if (config.layout.headerAlignment === 'center') {
            doc.text(splitText, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });
        } else {
            doc.text(splitText, margin, y, { maxWidth: contentWidth });
        }
        y += splitText.length * lineHeight;
      });
    }

    // Experience
    if (data.experience && data.experience.length > 0) {
      renderSection("PROFESSIONAL EXPERIENCE", () => {
        data.experience.forEach((exp, i) => {
          checkPageBreak(40);
          if (i > 0) y += 12; 

          // Date First (Right Aligned - Fixed Position)
          doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(config.colors.text);
          doc.text(exp.period, pageWidth - margin, y, { align: "right" });

          // Company (10pt)
          doc.setFont(config.fonts.heading === "Times New Roman" ? "times" : "helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(config.colors.primary);
          const companyText = exp.company.toUpperCase();
          doc.text(companyText, margin, y);
          const companyWidth = doc.getTextWidth(companyText);
          
          // Separator
          doc.setTextColor(config.colors.secondary);
          doc.setFont("helvetica", "normal");
          const sep = "  |  ";
          doc.text(sep, margin + companyWidth, y);
          const sepWidth = doc.getTextWidth(sep);
          
          // Role (11pt)
          doc.setTextColor(config.colors.text);
          doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "bold");
          doc.setFontSize(11); 
          doc.text(exp.role, margin + companyWidth + sepWidth, y);

          y += lineHeight + 2; 

          // Bullets
          doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(config.colors.text);
          
          exp.description.forEach(desc => {
             const bullet = "•";
             const bulletX = margin + 8;
             const textX = margin + 18;
             const textMaxWidth = contentWidth - 18;
             
             const splitDesc = doc.splitTextToSize(desc, textMaxWidth);
             checkPageBreak(splitDesc.length * lineHeight);
             
             doc.text(bullet, bulletX, y);
             doc.text(splitDesc, textX, y);
             
             y += (splitDesc.length * lineHeight) + 3; 
          });
        });
      });
    }

    // Education
    if (data.education && data.education.length > 0) {
      renderSection("EDUCATION", () => {
        data.education.forEach((edu, i) => {
          checkPageBreak(30);
          if (i > 0) y += 10;
          
          // Date (Right Aligned)
          doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(config.colors.text);
          doc.text(edu.period, pageWidth - margin, y, { align: "right" });

          // Institution
          doc.setFont(config.fonts.heading === "Times New Roman" ? "times" : "helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(config.colors.primary);
          const instText = edu.institution;
          doc.text(instText, margin, y);
          const instWidth = doc.getTextWidth(instText);
          
          // Separator
          doc.setTextColor(config.colors.secondary);
          doc.setFont("helvetica", "normal");
          const sep = "  |  ";
          doc.text(sep, margin + instWidth, y);
          const sepWidth = doc.getTextWidth(sep);
          
          // Degree
          doc.setTextColor(config.colors.text);
          doc.setFont(config.fonts.body === "Times New Roman" ? "times" : "helvetica", "italic");
          doc.setFontSize(11);
          doc.text(edu.degree, margin + instWidth + sepWidth, y);
          
          y += lineHeight + 4;
        });
      });
    }

    return doc.output('blob');
  }
}
