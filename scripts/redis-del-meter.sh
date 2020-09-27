redis-cli keys 'lula:meter:*' | xargs -n1 redis-cli del

