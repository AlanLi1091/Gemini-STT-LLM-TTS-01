import React from 'react';
import { parseSearchMetadata, searchSourceLink } from '../services/searchMetadata';

/** Search text stays separate from model content and is never interpreted as markup. */
export const SearchSources: React.FC<{ search?: unknown }> = ({ search }) => {
  const metadata = parseSearchMetadata(search);
  if (!metadata || metadata.status === 'not_requested') return null;
  if (metadata.status === 'degraded') return null;
  return (
    <section aria-label="本轮检索来源" className="mt-3 border-t border-zinc-200 pt-2 text-xs break-words">
      <h3 className="font-medium text-zinc-600">本轮检索来源</h3>
      <ol className="mt-2 space-y-3">
        {metadata.sources.map(source => {
          const { href, domain } = searchSourceLink(source.url);
          return (
            <li key={source.index}>
              <p><span>{source.index}. </span><span>{source.title}</span></p>
              <p className="mt-0.5">
                {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{domain}</a> : <span>{domain}</span>}
              </p>
              {href && <p className="mt-0.5 whitespace-pre-wrap text-zinc-600">{source.summary}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
