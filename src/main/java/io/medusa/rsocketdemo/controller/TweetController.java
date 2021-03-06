package io.medusa.rsocketdemo.controller;

import io.medusa.rsocketdemo.model.Tweet;
import io.medusa.rsocketdemo.model.TweetRequest;
import org.springframework.http.MediaType;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.rsocket.RSocketRequester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
public class TweetController {

    private final Mono<RSocketRequester> requester;

    public TweetController(Mono<RSocketRequester> requester) {
        this.requester = requester;
    }

    @GetMapping(value = "/tweets/{author}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Tweet> getByAuthorViaSocket(@PathVariable String author) {
        return requester.log().flatMapMany(r -> r.route("tweets.by.author").data(new TweetRequest(author, null)).retrieveFlux(Tweet.class));
    }

}