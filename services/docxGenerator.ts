
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  TabStopType, 
  TabStopPosition, 
  BorderStyle,
  ShadingType,
  ExternalHyperlink
} from "docx";
import { ResumeData, TemplateConfig, TemplateId } from "../types";

export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  modern: {
    id: 'modern',
    name: 'Modern Tech',
    description: 'Clean, sans-serif, left-aligned. Perfect for startups and tech roles.',
    fonts: {
      heading: "Arial",
      body: "Arial" // Switched from Roboto to Arial for web parity
    },
    layout: {
      headerAlignment: 'left',
      sectionHeaderStyle: 'uppercase-bold'
    },
    colors: {
      primary: "2563EB", // Blue
      secondary: "64748B",
      text: "0F172A"
    }
  },
  classic: {
    id: 'classic',
    name: 'Executive Classic',
    description: 'Serif fonts, centered layout. Best for Finance, Law, and C-Suite.',
    fonts: {
      heading: "Times New Roman",
      body: "Times New Roman"
    },
    layout: {
      headerAlignment: 'center',
      sectionHeaderStyle: 'border-bottom'
    },
    colors: {
      primary: "000000",
      secondary: "000000",
      text: "000000"
    }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Clean Minimalist',
    description: 'High whitespace, efficient. Great for general corporate roles.',
    fonts: {
      heading: "Calibri",
      body: "Calibri"
    },
    layout: {
      headerAlignment: 'left',
      sectionHeaderStyle: 'border-bottom'
    },
    colors: {
      primary: "333333",
      secondary: "666666",
      text: "222222"
    }
  }
};

export class DocxGenerator {
  /**
   * Generates a dynamic resume based on the selected Template Config.
   */
  async generate(data: ResumeData, templateId: TemplateId = 'modern'): Promise<Blob> {
    const config = TEMPLATES[templateId];

    const doc = new Document({
      creator: "ATS Optimizer",
      title: data.fullName || "Resume",
      description: "Optimized Resume",
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: config.fonts.body,
              size: 20, // 10pt standard body
              color: config.colors.text
            },
            paragraph: {
              // 240 = 1.0 (Single). Compact for single page.
              spacing: { line: 240 }, 
            },
          },
          {
            id: "Bullet",
            name: "Bullet Style",
            basedOn: "Normal",
            run: {
              font: config.fonts.body,
              size: 20, // 10pt
              color: config.colors.text
            },
            paragraph: {
              // Reduced Indent: Left 0.16in (240), Hanging 0.11in (160). 
              // Moves bullet closer to margin and text closer to bullet.
              indent: { left: 240, hanging: 160 },
              // Removed spacing after items (0) for maximum density
              spacing: { after: 0 }, 
            },
          }
        ],
      },
      sections: [
        {
          properties: {
            page: {
              // Exact 0.5 inch (12.7mm) to match Web Preview
              margin: {
                top: 720, 
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: [
            ...this.createHeader(data, config),
            
            ...this.createSectionHeading("PROFESSIONAL SUMMARY", config),
            this.createSummary(data.summary, config),

            ...this.createSectionHeading("CORE COMPETENCIES", config),
            this.createSkills(data.skills, config),

            ...this.createSectionHeading("PROFESSIONAL EXPERIENCE", config),
            ...this.createExperience(data.experience, config),
            
            ...this.createSectionHeading("EDUCATION", config),
            ...this.createEducation(data.education, config),
          ],
        },
      ],
    });

    return await Packer.toBlob(doc);
  }

  // --- Dynamic Components ---

  private createHeader(data: ResumeData, config: TemplateConfig): Paragraph[] {
    const align = config.layout.headerAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
    
    // Header logic: Name
    const namePara = new Paragraph({
        children: [
          new TextRun({
            text: (data.fullName || "YOUR NAME").toUpperCase(),
            font: config.fonts.heading,
            size: 28, // 14pt
            bold: true,
            color: config.colors.primary, 
          })
        ],
        alignment: align,
        spacing: { after: 40 }, 
      });

    // Header logic: Contact (Phone | Email | LinkedIn)
    // Reduced spacing in separators
    const separator = config.layout.headerAlignment === 'center' ? " | " : " • ";
    
    const children: (TextRun | ExternalHyperlink)[] = [];

    // 1. Phone
    if (data.phone) {
        children.push(new TextRun({ 
            text: data.phone, 
            size: 19, // 9.5pt
            color: config.colors.secondary 
        }));
    }

    // 2. Email
    if (data.email) {
        if (children.length > 0) children.push(new TextRun({ text: separator, size: 19, color: config.colors.secondary }));
        
        children.push(new ExternalHyperlink({
            children: [
                new TextRun({
                    text: data.email,
                    style: "Hyperlink",
                    size: 19,
                    color: config.colors.primary,
                }),
            ],
            link: `mailto:${data.email}`,
        }));
    }

    // 3. LinkedIn
    if (data.linkedin) {
        if (children.length > 0) children.push(new TextRun({ text: separator, size: 19, color: config.colors.secondary }));
        
        children.push(new ExternalHyperlink({
            children: [
                new TextRun({
                    text: "LinkedIn", // Fixed text as per user request
                    style: "Hyperlink",
                    size: 19,
                    color: config.colors.primary,
                }),
            ],
            link: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`,
        }));
    }

    const contactPara = new Paragraph({
        children: children,
        alignment: align,
        border: {
            bottom: {
                color: "E2E8F0",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 2
            }
        },
        // Reduced from 120 -> 80
        spacing: { after: 80 }, 
    });

    return [namePara, contactPara];
  }

  private createSectionHeading(text: string, config: TemplateConfig): Paragraph[] {
    const border = config.layout.sectionHeaderStyle === 'border-bottom' ? {
      bottom: {
        color: config.colors.primary,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 4,
      },
    } : undefined;

    const shading = config.layout.sectionHeaderStyle === 'shaded' ? {
        type: ShadingType.CLEAR,
        fill: "F3F4F6", 
    } : undefined;

    return [
      new Paragraph({
        children: [
            new TextRun({
                text: text,
                font: config.fonts.heading,
                size: 22, // 11pt
                bold: true,
                allCaps: true,
                color: config.colors.primary,
            })
        ],
        heading: HeadingLevel.HEADING_2,
        border: border,
        shading: shading,
        // Reduced before: 100->80 (4pt), after: 60->40 (2pt)
        spacing: { before: 80, after: 40 }, 
      }),
    ];
  }

  private createSummary(summary: string, config: TemplateConfig): Paragraph {
    return new Paragraph({
      children: [new TextRun({ 
          text: summary || "", 
          size: 20, // 10pt
          font: config.fonts.body
      })],
      alignment: AlignmentType.JUSTIFIED,
      // Reduced after: 120->80
      spacing: { after: 80 }
    });
  }

  private createSkills(skills: string[], config: TemplateConfig): Paragraph {
    // Reduced spaces around separator
    const separator = " • ";
    return new Paragraph({
      children: [
        new TextRun({
          text: (skills || []).join(separator),
          size: 20, // 10pt
          font: config.fonts.body,
          bold: false
        }),
      ],
      alignment: config.layout.headerAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      // Reduced after: 120->80
      spacing: { after: 80 }
    });
  }

  private createExperience(experience: ResumeData['experience'], config: TemplateConfig): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    (experience || []).forEach((exp, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company.toUpperCase(),
              bold: true,
              size: 20, // 10pt
              font: config.fonts.heading,
              color: config.colors.primary
            }),
            new TextRun({
              text: " | ", // Reduced spaces
              size: 20,
              font: config.fonts.body,
              color: config.colors.secondary
            }),
            new TextRun({
              text: exp.role,
              bold: true,
              size: 20, // 10pt
              font: config.fonts.body,
            }),
            new TextRun({
              text: `\t${exp.period}`, 
              bold: true,
              size: 18, // 9pt
              font: config.fonts.body,
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          // Reduced before: 120->100 (for subsequent items), after: 60->40
          spacing: { before: index === 0 ? 0 : 100, after: 40 }, 
        })
      );

      (exp.description || []).forEach((desc) => {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ 
                text: desc, 
                size: 20, // 10pt
                font: config.fonts.body 
            })],
            bullet: { level: 0 }, 
            style: "Bullet",      
          })
        );
      });
    });

    return paragraphs;
  }

  private createEducation(education: ResumeData['education'], config: TemplateConfig): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    (education || []).forEach((edu, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.institution,
              bold: true,
              size: 20, // 10pt
              font: config.fonts.heading,
              color: config.colors.primary
            }),
             new TextRun({
              text: " | ", // Reduced spaces
              size: 20,
              font: config.fonts.body,
              color: config.colors.secondary
            }),
            new TextRun({
                text: edu.degree,
                italics: true,
                size: 20, // 10pt
                font: config.fonts.body,
            }),
            new TextRun({
              text: `\t${edu.period}`,
              bold: true,
              size: 18, // 9pt
              font: config.fonts.body,
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          // Reduced before: 80->60, after: 40->30
          spacing: { before: index === 0 ? 0 : 60, after: 30 },
        })
      );
    });

    return paragraphs;
  }
}
