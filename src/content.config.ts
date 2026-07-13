import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    category: z.string().default('미분류'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    notionId: z.string().optional(),
  }),
});

export const collections = { posts };
